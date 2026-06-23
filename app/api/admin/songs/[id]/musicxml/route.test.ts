import { beforeEach, describe, expect, it, vi } from "vitest";

const { attachSongMusicXml, deleteAttachedSongMusicXml } = vi.hoisted(() => ({
  attachSongMusicXml: vi.fn(),
  deleteAttachedSongMusicXml: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/admin-song-management", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/modules/songs/services/admin-song-management")
  >("@/src/modules/songs/services/admin-song-management");

  return {
    ...actual,
    attachSongMusicXml,
    deleteAttachedSongMusicXml,
  };
});

import { DELETE, PUT } from "./route";

const context = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("/api/admin/songs/:id/musicxml", () => {
  beforeEach(() => {
    attachSongMusicXml.mockReset();
    deleteAttachedSongMusicXml.mockReset();
  });

  it("attaches a MusicXML file", async () => {
    attachSongMusicXml.mockResolvedValue({
      id: "song-id",
      musicXmlSource: { downloadUrl: "/api/songs/chant/musicxml" },
    });
    const body = new FormData();
    const file = new File(
      [`<score-partwise version="4.0"></score-partwise>`],
      "partition.musicxml",
      { type: "application/vnd.recordare.musicxml+xml" },
    );
    body.append("musicxml", file);

    const response = await PUT(
      new Request("http://localhost", { method: "PUT", body }),
      context,
    );

    expect(response.status).toBe(200);
    expect(attachSongMusicXml).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      expect.objectContaining({
        name: "partition.musicxml",
        size: file.size,
        type: "application/vnd.recordare.musicxml+xml",
      }),
    );
  });

  it("rejects a request without a MusicXML file", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: new FormData(),
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(attachSongMusicXml).not.toHaveBeenCalled();
  });

  it("deletes the attached MusicXML source", async () => {
    deleteAttachedSongMusicXml.mockResolvedValue({
      id: "song-id",
      musicXmlSource: null,
    });

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    expect(deleteAttachedSongMusicXml).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
