import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteDraftSong, getAdminSong, updateAdminSong } = vi.hoisted(() => ({
  deleteDraftSong: vi.fn(),
  getAdminSong: vi.fn(),
  updateAdminSong: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/admin-song-management", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/modules/songs/services/admin-song-management")
  >("@/src/modules/songs/services/admin-song-management");

  return {
    ...actual,
    deleteDraftSong,
    getAdminSong,
    updateAdminSong,
  };
});

import { PublishedSongDeletionError } from "@/src/modules/songs/services/admin-song-management";

import { DELETE } from "./route";

const context = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("DELETE /api/admin/songs/:id", () => {
  beforeEach(() => {
    deleteDraftSong.mockReset();
  });

  it("deletes a draft", async () => {
    deleteDraftSong.mockResolvedValue(true);

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(204);
  });

  it("refuses to delete a published song", async () => {
    deleteDraftSong.mockRejectedValue(new PublishedSongDeletionError());

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "PUBLISHED_SONG_DELETE_FORBIDDEN" },
    });
  });
});
