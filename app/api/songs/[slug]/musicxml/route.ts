import {
  authorizationBoundaryResponse,
  requireRequestPermission,
} from "@/src/infrastructure/auth/require-admin";
import {
  sanitizeMusicXml,
  UnsafeMusicXmlError,
} from "@/src/modules/songs/music/music-xml-security";
import { getPublicSongMusicXmlBySlug } from "@/src/modules/songs/services/public-song-catalog";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function musicXmlNotFoundResponse() {
  return Response.json(
    {
      error: {
        code: "MUSICXML_NOT_FOUND",
        message: "Partition MusicXML introuvable.",
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
  const safeFileName = (fileName || `${slug}.musicxml`).replace(
    /["\\\r\n]/g,
    "",
  );
  return `${asAttachment ? "attachment" : "inline"}; filename="${safeFileName}"`;
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
  const musicXmlSource = await getPublicSongMusicXmlBySlug(slug);

  if (!musicXmlSource) {
    return musicXmlNotFoundResponse();
  }

  try {
    return new Response(sanitizeMusicXml(musicXmlSource.content), {
      headers: {
        "cache-control": "private, no-store",
        "content-security-policy":
          "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'",
        "content-type": "application/vnd.recordare.musicxml+xml; charset=utf-8",
        "content-disposition": contentDisposition(
          musicXmlSource.fileName,
          slug,
          asAttachment,
        ),
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof UnsafeMusicXmlError) {
      console.error("Unsafe stored MusicXML was blocked.", { slug });
      return Response.json(
        {
          error: {
            code: "UNSAFE_MUSICXML",
            message: "Cette partition MusicXML ne peut pas être affichée.",
          },
        },
        { status: 422 },
      );
    }

    throw error;
  }
}
