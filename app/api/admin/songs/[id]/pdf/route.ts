import {
  attachSongPdf,
  deleteAttachedSongPdf,
} from "@/src/modules/songs/services/admin-song-management";
import {
  adminSongErrorResponse,
  songNotFoundResponse,
} from "@/src/modules/songs/http/admin-song-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function invalidPdfResponse() {
  return Response.json(
    {
      error: {
        code: "INVALID_PDF",
        message: "Ajoute une partition PDF valide.",
      },
    },
    { status: 400 },
  );
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("pdf");

  if (!(file instanceof File)) {
    return invalidPdfResponse();
  }

  try {
    const song = await attachSongPdf(id, file);
    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const song = await deleteAttachedSongPdf(id);
    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
