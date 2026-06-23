import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authSessionCookieName,
  createAuthSessionToken,
} from "@/src/infrastructure/auth/session";

const { getPublicSongMusicXmlBySlug } = vi.hoisted(() => ({
  getPublicSongMusicXmlBySlug: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  getPublicSongMusicXmlBySlug,
}));

import { GET } from "./route";

function authenticatedRequest() {
  return new Request("http://localhost", {
    headers: {
      cookie: `${authSessionCookieName}=${createAuthSessionToken()}`,
    },
  });
}

describe("GET /api/songs/:slug/musicxml", () => {
  beforeEach(() => {
    getPublicSongMusicXmlBySlug.mockReset();
  });

  it("returns a public song MusicXML source", async () => {
    getPublicSongMusicXmlBySlug.mockResolvedValue({
      content: `<score-partwise version="4.0"></score-partwise>`,
      fileName: "partition.musicxml",
      mimeType: "application/vnd.recordare.musicxml+xml",
      fileSizeBytes: 48,
      downloadUrl: "/api/songs/chant/musicxml",
    });

    const response = await GET(authenticatedRequest(), {
      params: Promise.resolve({ slug: "chant" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.recordare.musicxml+xml",
    );
    expect(response.headers.get("content-disposition")).toContain(
      "partition.musicxml",
    );
    expect(await response.text()).toContain("<score-partwise");
  });

  it("returns 404 when no MusicXML source exists", async () => {
    getPublicSongMusicXmlBySlug.mockResolvedValue(null);

    const response = await GET(authenticatedRequest(), {
      params: Promise.resolve({ slug: "chant" }),
    });

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "chant" }),
    });

    expect(response.status).toBe(401);
    expect(getPublicSongMusicXmlBySlug).not.toHaveBeenCalled();
  });
});
