import { beforeEach, describe, expect, it, vi } from "vitest";

const { publishSong, unpublishSong } = vi.hoisted(() => ({
  publishSong: vi.fn(),
  unpublishSong: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/admin-song-management", () => ({
  publishSong,
  unpublishSong,
}));

import { PUT } from "./route";

const context = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("PUT /api/admin/songs/:id/publication", () => {
  beforeEach(() => {
    publishSong.mockReset();
    unpublishSong.mockReset();
  });

  it("publishes a song", async () => {
    publishSong.mockResolvedValue({ id: "song-id", status: "published" });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ published: true }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(publishSong).toHaveBeenCalled();
    expect(unpublishSong).not.toHaveBeenCalled();
  });

  it("unpublishes a song", async () => {
    unpublishSong.mockResolvedValue({ id: "song-id", status: "draft" });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ published: false }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(unpublishSong).toHaveBeenCalled();
  });

  it("rejects an invalid publication state", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ published: "yes" }),
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(publishSong).not.toHaveBeenCalled();
  });
});
