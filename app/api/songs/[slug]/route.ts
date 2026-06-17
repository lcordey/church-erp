import { getPublicSongBySlug } from "@/src/modules/songs/services/public-song-catalog";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const song = await getPublicSongBySlug(slug);

  if (!song) {
    return Response.json(
      { error: { code: "SONG_NOT_FOUND", message: "Chant introuvable." } },
      { status: 404 },
    );
  }

  return Response.json({ data: song });
}
