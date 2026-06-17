import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicSongBySlug } = vi.hoisted(() => ({
  getPublicSongBySlug: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  getPublicSongBySlug,
}));

import { GET } from "./route";

describe("GET /api/songs/:slug", () => {
  beforeEach(() => {
    getPublicSongBySlug.mockReset();
  });

  it("returns a published song detail", async () => {
    getPublicSongBySlug.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Chant publié",
      slug: "chant-publie",
      author: null,
      copyright: null,
      defaultKey: "D",
      collection: null,
      collectionNumber: null,
      sourcePageUrl: null,
      pdfSource: null,
      chordProContent: "[D]Paroles",
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "chant-publie" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: expect.objectContaining({ slug: "chant-publie" }),
    });
  });

  it("returns 404 when the song is not public", async () => {
    getPublicSongBySlug.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "brouillon" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "SONG_NOT_FOUND",
        message: "Chant introuvable.",
      },
    });
  });
});
