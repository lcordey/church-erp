import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteSetlist, getSetlist, updateSetlist } = vi.hoisted(() => ({
  deleteSetlist: vi.fn(),
  getSetlist: vi.fn(),
  updateSetlist: vi.fn(),
}));

vi.mock("@/src/modules/setlists/services/setlist-management", () => ({
  deleteSetlist,
  getSetlist,
  updateSetlist,
}));

import { DELETE, GET, PUT } from "./route";

const context = {
  params: Promise.resolve({ id: "33333333-3333-4333-8333-333333333333" }),
};

describe("/api/setlists/:id", () => {
  beforeEach(() => {
    deleteSetlist.mockReset();
    getSetlist.mockReset();
    updateSetlist.mockReset();
  });

  it("returns a setlist detail", async () => {
    getSetlist.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Dimanche matin",
      items: [],
    });

    const response = await GET(new Request("http://localhost/api/setlists/id"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: expect.objectContaining({ title: "Dimanche matin" }),
    });
  });

  it("updates a setlist", async () => {
    updateSetlist.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Louange du soir",
      items: [],
    });

    const response = await PUT(
      new Request("http://localhost/api/setlists/id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Louange du soir",
          songIds: ["11111111-1111-4111-8111-111111111111"],
        }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(updateSetlist).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      {
        title: "Louange du soir",
        songIds: ["11111111-1111-4111-8111-111111111111"],
      },
    );
  });

  it("deletes a setlist", async () => {
    deleteSetlist.mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost/api/setlists/id", { method: "DELETE" }),
      context,
    );

    expect(response.status).toBe(204);
  });

  it("returns 404 when the setlist does not exist", async () => {
    getSetlist.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/setlists/id"), context);

    expect(response.status).toBe(404);
  });
});
