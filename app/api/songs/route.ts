import { listPublicSongs } from "@/src/modules/songs/services/public-song-catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const songs = await listPublicSongs(url.searchParams.get("q") ?? "");

  return Response.json({ data: songs });
}
