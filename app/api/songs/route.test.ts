import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicSongResults, listPublicSongs } = vi.hoisted(() => ({
  listPublicSongResults: vi.fn(),
  listPublicSongs: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  listPublicSongResults,
  listPublicSongs,
  PUBLIC_SONG_PAGE_SIZE: 20,
}));

import { GET } from "./route";

describe("GET /api/songs", () => {
  beforeEach(() => {
    listPublicSongResults.mockReset();
    listPublicSongs.mockReset();
  });

  it("returns the public song summaries", async () => {
    listPublicSongResults.mockResolvedValue({
      songs: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Chant publié",
          slug: "chant-publie",
          author: null,
          copyright: null,
          defaultKey: "D",
          collection: "JEM",
          collectionNumber: 1,
          sourcePageUrl: "https://jemaf.fr/chant/jem001",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/songs?q=jem&collections=JEM,LeMont&themes=11111111-1111-4111-8111-111111111111&labels=22222222-2222-4222-8222-222222222222,invalide&limit=20&offset=40",
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      data: expect.objectContaining({
        songs: [
          expect.objectContaining({
            slug: "chant-publie",
          }),
        ],
        total: 1,
      }),
    });
    expect(body.data).not.toHaveProperty("collections");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    expect(listPublicSongResults).toHaveBeenCalledWith({
      collections: ["JEM", "LeMont"],
      limit: 20,
      offset: 40,
      search: "jem",
      themeIds: ["11111111-1111-4111-8111-111111111111"],
      labelIds: ["22222222-2222-4222-8222-222222222222"],
    });
  });

  it("includes collection filters when requested for initial loading", async () => {
    listPublicSongs.mockResolvedValue({
      songs: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false,
      collections: ["Glorious", "JEM"],
      themes: [],
      labels: [],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/songs?collections=JEM&includeCollections=true",
      ),
    );
    const body = await response.json();

    expect(body.data.collections).toEqual(["Glorious", "JEM"]);
    expect(listPublicSongs).toHaveBeenCalledWith({
      collections: ["JEM"],
      limit: 20,
      offset: 0,
      search: "",
      themeIds: [],
      labelIds: [],
    });
    expect(listPublicSongResults).not.toHaveBeenCalled();
  });
});
