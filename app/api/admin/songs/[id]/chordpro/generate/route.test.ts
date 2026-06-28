import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateAdminSongChordProFromMusicXml } = vi.hoisted(() => ({
  generateAdminSongChordProFromMusicXml: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/admin-song-management", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/modules/songs/services/admin-song-management")
  >("@/src/modules/songs/services/admin-song-management");

  return {
    ...actual,
    generateAdminSongChordProFromMusicXml,
  };
});

import { POST } from "./route";

const context = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("POST /api/admin/songs/:id/chordpro/generate", () => {
  beforeEach(() => {
    generateAdminSongChordProFromMusicXml.mockReset();
  });

  it("returns generated chordpro content", async () => {
    generateAdminSongChordProFromMusicXml.mockResolvedValue({
      chordProContent: "{title: Hosanna}\n[A]Hosanna",
      defaultKey: "A",
    });

    const response = await POST(new Request("http://localhost", {
      method: "POST",
    }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        chordProContent: "{title: Hosanna}\n[A]Hosanna",
        defaultKey: "A",
      },
    });
    expect(generateAdminSongChordProFromMusicXml).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "default",
    );
  });

  it("passes the requested alternative algorithm", async () => {
    generateAdminSongChordProFromMusicXml.mockResolvedValue({
      chordProContent: "{title: Hosanna}\n[C]Ho-[G]sanna",
      defaultKey: "C",
    });

    const response = await POST(new Request("http://localhost?algorithm=ironss", {
      method: "POST",
    }), context);

    expect(response.status).toBe(200);
    expect(generateAdminSongChordProFromMusicXml).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "ironss",
    );
  });

  it("returns not found when the song does not exist", async () => {
    generateAdminSongChordProFromMusicXml.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", {
      method: "POST",
    }), context);

    expect(response.status).toBe(404);
  });
});
