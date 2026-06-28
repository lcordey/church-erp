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

import {
  PublishedSongDeletionError,
  RestrictedSongMetadataEditError,
} from "@/src/modules/songs/services/admin-song-management";

import { DELETE, PUT } from "./route";

const context = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("DELETE /api/admin/songs/:id", () => {
  beforeEach(() => {
    deleteDraftSong.mockReset();
    updateAdminSong.mockReset();
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

  it("refuses to change locked official metadata", async () => {
    updateAdminSong.mockRejectedValue(
      new RestrictedSongMetadataEditError({
        author: "locked",
      }),
    );

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Mon chant",
          slug: "mon-chant",
          author: "Auteur modifie",
          chordProContent: "[C]Paroles",
        }),
      }),
      context,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: {
        code: "RESTRICTED_SONG_METADATA",
        fields: {
          author: "locked",
        },
      },
    });
  });
});
