import { beforeEach, describe, expect, it, vi } from "vitest";

const { createDraftSong, listAdminSongs } = vi.hoisted(() => ({
  createDraftSong: vi.fn(),
  listAdminSongs: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/admin-song-management", () => ({
  createDraftSong,
  listAdminSongs,
}));

import { GET, POST } from "./route";

describe("/api/admin/songs", () => {
  beforeEach(() => {
    createDraftSong.mockReset();
    listAdminSongs.mockReset();
  });

  it("lists draft and published songs for administration", async () => {
    listAdminSongs.mockResolvedValue([{ id: "song-id", status: "draft" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ id: "song-id", status: "draft" }],
    });
  });

  it("creates a validated draft", async () => {
    createDraftSong.mockResolvedValue({
      id: "song-id",
      status: "draft",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/songs", {
        method: "POST",
        body: JSON.stringify({
          title: "Mon chant",
          slug: "mon-chant",
          copyright: "© Exemple",
          chordProContent: "[C]Paroles",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createDraftSong).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "mon-chant" }),
    );
  });

  it("rejects invalid input before calling the service", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/songs", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createDraftSong).not.toHaveBeenCalled();
  });
});
