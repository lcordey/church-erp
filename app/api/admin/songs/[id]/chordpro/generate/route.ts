import { generateAdminSongChordProFromMusicXml } from "@/src/modules/songs/services/admin-song-management";
import {
  adminSongErrorResponse,
  songNotFoundResponse,
} from "@/src/modules/songs/http/admin-song-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const generated = await generateAdminSongChordProFromMusicXml(id);
    return generated
      ? Response.json({ data: generated })
      : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
