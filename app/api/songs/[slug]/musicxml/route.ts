import {
  authenticationRequiredResponse,
  AuthenticationRequiredError,
  requireAuthenticatedRequest,
} from "@/src/infrastructure/auth/require-admin";
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
  const safeFileName = (fileName || `${slug}.musicxml`).replace(/["\r\n]/g, "");
  return `${asAttachment ? "attachment" : "inline"}; filename="${safeFileName}"`;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    requireAuthenticatedRequest(request);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return authenticationRequiredResponse();
    }

    throw error;
  }

  const { slug } = await params;
  const asAttachment = new URL(request.url).searchParams.get("download") === "1";
  const musicXmlSource = await getPublicSongMusicXmlBySlug(slug);

  if (!musicXmlSource) {
    return musicXmlNotFoundResponse();
  }

  return new Response(musicXmlSource.content, {
    headers: {
      "content-type":
        musicXmlSource.mimeType || "application/vnd.recordare.musicxml+xml",
      "content-disposition": contentDisposition(
        musicXmlSource.fileName,
        slug,
        asAttachment,
      ),
    },
  });
}
