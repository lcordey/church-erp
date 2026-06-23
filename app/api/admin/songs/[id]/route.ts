import {
  deleteDraftSong,
  getAdminSong,
  updateAdminSong,
} from "@/src/modules/songs/services/admin-song-management";
import {
  adminSongErrorResponse,
  invalidSongResponse,
  songNotFoundResponse,
} from "@/src/modules/songs/http/admin-song-response";
import { validateAdminSongInput } from "@/src/modules/songs/validation/admin-song-input";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const song = await getAdminSong(id);
    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const input = validateAdminSongInput(await request.json().catch(() => null));

  if (!input.success) {
    return invalidSongResponse(input.errors);
  }

  try {
    const song = await updateAdminSong(id, input.data);
    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const deleted = await deleteDraftSong(id);

    return deleted
      ? new Response(null, { status: 204 })
      : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
