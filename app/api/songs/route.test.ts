import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicSongs } = vi.hoisted(() => ({
  listPublicSongs: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  listPublicSongs,
  PUBLIC_SONG_PAGE_SIZE: 20,
}));

import { GET } from "./route";

describe("GET /api/songs", () => {
  beforeEach(() => {
    listPublicSongs.mockReset();
  });

  it("returns the public song summaries", async () => {
    listPublicSongs.mockResolvedValue({
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
          pdfSource: {
            fileName: "jem001.pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 1234,
            downloadUrl: "/api/songs/chant-publie/pdf",
          },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false,
      collections: ["JEM"],
    });

    const response = await GET(
      new Request(
        "http://localhost/api/songs?q=jem&collections=JEM,LeMont&limit=20&offset=40",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: expect.objectContaining({
        songs: [
          expect.objectContaining({
            pdfSource: expect.objectContaining({
              downloadUrl: "/api/songs/chant-publie/pdf",
            }),
            slug: "chant-publie",
          }),
        ],
        total: 1,
      }),
    });
    expect(listPublicSongs).toHaveBeenCalledWith({
      collections: ["JEM", "LeMont"],
      limit: 20,
      offset: 40,
      search: "jem",
    });
  });
});
