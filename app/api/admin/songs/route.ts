import {
  createDraftSong,
  listAdminSongs,
} from "@/src/modules/songs/services/admin-song-management";
import { adminSongErrorResponse } from "@/src/modules/songs/http/admin-song-response";
import {
  invalidSongResponse,
} from "@/src/modules/songs/http/admin-song-response";
import { validateAdminSongInput } from "@/src/modules/songs/validation/admin-song-input";

export async function GET() {
  try {
    const songs = await listAdminSongs();
    return Response.json({ data: songs });
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const input = validateAdminSongInput(await request.json().catch(() => null));

  if (!input.success) {
    return invalidSongResponse(input.errors);
  }

  try {
    const song = await createDraftSong(input.data);
    return Response.json({ data: song }, { status: 201 });
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
