import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicSongs } = vi.hoisted(() => ({
  listPublicSongs: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  listPublicSongs,
}));

import { GET } from "./route";

describe("GET /api/songs", () => {
  beforeEach(() => {
    listPublicSongs.mockReset();
  });

  it("returns the public song summaries", async () => {
    listPublicSongs.mockResolvedValue([
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
    ]);

    const response = await GET(new Request("http://localhost/api/songs?q=jem"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        expect.objectContaining({
          pdfSource: expect.objectContaining({
            downloadUrl: "/api/songs/chant-publie/pdf",
          }),
          slug: "chant-publie",
        }),
      ],
    });
    expect(listPublicSongs).toHaveBeenCalledWith("jem");
  });
});
