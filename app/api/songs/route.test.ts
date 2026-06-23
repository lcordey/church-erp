import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicSongResults } = vi.hoisted(() => ({
  listPublicSongResults: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  listPublicSongResults,
  PUBLIC_SONG_PAGE_SIZE: 20,
}));

import { GET } from "./route";

describe("GET /api/songs", () => {
  beforeEach(() => {
    listPublicSongResults.mockReset();
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
          pdfSource: {
            fileName: "jem001.pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 1234,
            downloadUrl: "/api/songs/chant-publie/pdf",
          },
          musicXmlSource: null,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/songs?q=jem&collections=JEM,LeMont&limit=20&offset=40",
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
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
    expect(body.data).not.toHaveProperty("collections");
    expect(listPublicSongResults).toHaveBeenCalledWith({
      collections: ["JEM", "LeMont"],
      limit: 20,
      offset: 40,
      search: "jem",
    });
  });
});
