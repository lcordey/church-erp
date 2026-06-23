import {
  attachSongMusicXml,
  deleteAttachedSongMusicXml,
} from "@/src/modules/songs/services/admin-song-management";
import {
  adminSongErrorResponse,
  songNotFoundResponse,
} from "@/src/modules/songs/http/admin-song-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function invalidMusicXmlResponse() {
  return Response.json(
    {
      error: {
        code: "INVALID_MUSICXML",
        message: "Ajoute une partition MusicXML valide.",
      },
    },
    { status: 400 },
  );
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("musicxml");

  if (!(file instanceof File)) {
    return invalidMusicXmlResponse();
  }

  try {
    const song = await attachSongMusicXml(id, file);
    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const song = await deleteAttachedSongMusicXml(id);
    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
