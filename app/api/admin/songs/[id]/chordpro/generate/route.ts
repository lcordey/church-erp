import { generateAdminSongChordProFromMusicXml } from "@/src/modules/songs/services/admin-song-management";
import {
  adminSongErrorResponse,
  songNotFoundResponse,
} from "@/src/modules/songs/http/admin-song-response";
import type { MusicXmlChordProGenerationAlgorithm } from "@/src/modules/songs/types/admin-song";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const requestUrl = new URL(_request.url);
  const algorithm = requestUrl.searchParams.get("algorithm");
  const normalizedAlgorithm: MusicXmlChordProGenerationAlgorithm =
    algorithm === "ironss" ? "ironss" : "default";

  try {
    const generated = await generateAdminSongChordProFromMusicXml(
      id,
      normalizedAlgorithm,
    );
    return generated
      ? Response.json({ data: generated })
      : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
