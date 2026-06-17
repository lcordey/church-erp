import {
  downloadSongPdf,
  StorageObjectNotFoundError,
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

function contentDisposition(fileName: string | null, slug: string) {
  const safeFileName = (fileName || `${slug}.pdf`).replace(/["\r\n]/g, "");
  return `inline; filename="${safeFileName}"`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const pdfSource = await getPublicSongPdfBySlug(slug);

  if (!pdfSource) {
    return pdfNotFoundResponse();
  }

  try {
    const storageResponse = await downloadSongPdf(pdfSource.storagePath);
    const headers = new Headers();

    headers.set(
      "content-type",
      storageResponse.headers.get("content-type") ||
        pdfSource.mimeType ||
        "application/pdf",
    );
    headers.set(
      "content-disposition",
      contentDisposition(pdfSource.fileName, slug),
    );

    const contentLength = storageResponse.headers.get("content-length");

    if (contentLength) {
      headers.set("content-length", contentLength);
    }

    return new Response(storageResponse.body, { headers });
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      return pdfNotFoundResponse();
    }

    console.error(error);

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
