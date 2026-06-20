import {
  listPublicSongs,
  PUBLIC_SONG_PAGE_SIZE,
} from "@/src/modules/songs/services/public-song-catalog";

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCollections(value: string | null): string[] {
  return value
    ? value
        .split(",")
        .map((collection) => collection.trim())
        .filter(Boolean)
    : [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const catalog = await listPublicSongs({
    collections: parseCollections(url.searchParams.get("collections")),
    limit: parsePositiveInteger(
      url.searchParams.get("limit"),
      PUBLIC_SONG_PAGE_SIZE,
    ),
    offset: parsePositiveInteger(url.searchParams.get("offset"), 0),
    search: url.searchParams.get("q") ?? "",
  });

  return Response.json({ data: catalog });
}
