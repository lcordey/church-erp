import {
  authorizationBoundaryResponse,
  requireRequestPermission,
} from "@/src/infrastructure/auth/require-admin";
import {
  downloadSongPdf,
  StorageConfigurationError,
  StorageObjectNotFoundError,
  StorageRequestError,
} from "@/src/infrastructure/storage/song-pdf-storage";
import { getPublicSongPdfBySlug } from "@/src/modules/songs/services/public-song-catalog";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function pdfNotFoundResponse() {
  return Response.json(
    {
      error: {
        code: "PDF_NOT_FOUND",
        message: "Partition PDF introuvable.",
      },
    },
    { status: 404 },
  );
}

function contentDisposition(
  fileName: string | null,
  slug: string,
  asAttachment: boolean,
) {
  const preferredFileName = (fileName || `${slug}.pdf`).replace(/[\r\n]/g, "");
  const fallbackFileName =
    preferredFileName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/["\\]/g, "") || `${slug}.pdf`;
  const encodedFileName = encodeURIComponent(preferredFileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${asAttachment ? "attachment" : "inline"}; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await requireRequestPermission(request, "score.read");
  } catch (error) {
    const response = authorizationBoundaryResponse(error);
    if (response) return response;
    throw error;
  }

  const { slug } = await params;
  const asAttachment = new URL(request.url).searchParams.get("download") === "1";
  const pdfSource = await getPublicSongPdfBySlug(slug);

  if (!pdfSource) {
    return pdfNotFoundResponse();
  }

  try {
    const storageResponse = await downloadSongPdf(pdfSource.storagePath);
    const headers = new Headers();

    headers.set("cache-control", "private, no-store");
    headers.set(
      "content-security-policy",
      "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'",
    );
    headers.set("content-type", "application/pdf");
    headers.set(
      "content-disposition",
      contentDisposition(pdfSource.fileName, slug, asAttachment),
    );
    headers.set("x-content-type-options", "nosniff");

    const contentLength = storageResponse.headers.get("content-length");

    if (contentLength) {
      headers.set("content-length", contentLength);
    }

    return new Response(storageResponse.body, { headers });
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      return pdfNotFoundResponse();
    }

    if (error instanceof StorageConfigurationError) {
      console.error("Song PDF storage is not configured.");
    } else if (error instanceof StorageRequestError) {
      console.error("Song PDF storage request failed.", {
        status: error.status,
        responseBody: error.responseBody,
        storagePath: pdfSource.storagePath,
      });
    } else {
      console.error(error);
    }

    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Impossible de charger la partition PDF.",
        },
      },
      { status: 500 },
    );
  }
}
