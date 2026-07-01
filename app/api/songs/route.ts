import {
  listPublicSongResults,
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseIds(value: string | null): string[] {
  return parseCollections(value).filter((id) => uuidPattern.test(id));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = {
    collections: parseCollections(url.searchParams.get("collections")),
    limit: parsePositiveInteger(
      url.searchParams.get("limit"),
      PUBLIC_SONG_PAGE_SIZE,
    ),
    offset: parsePositiveInteger(url.searchParams.get("offset"), 0),
    search: url.searchParams.get("q") ?? "",
    themeIds: parseIds(url.searchParams.get("themes")),
    labelIds: parseIds(url.searchParams.get("labels")),
  };
  const includeCollections =
    url.searchParams.get("includeCollections") === "true";
  const catalog = includeCollections
    ? await listPublicSongs(query)
    : await listPublicSongResults(query);

  return Response.json(
    { data: catalog },
    {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
