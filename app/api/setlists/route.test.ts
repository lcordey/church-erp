import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSetlist, listSetlists } = vi.hoisted(() => ({
  createSetlist: vi.fn(),
  listSetlists: vi.fn(),
}));

vi.mock("@/src/modules/setlists/services/setlist-management", () => ({
  createSetlist,
  listSetlists,
}));

import { GET, POST } from "./route";

describe("/api/setlists", () => {
  beforeEach(() => {
    createSetlist.mockReset();
    listSetlists.mockReset();
  });

  it("lists setlists", async () => {
    listSetlists.mockResolvedValue([
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Dimanche matin",
        songCount: 2,
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        expect.objectContaining({
          title: "Dimanche matin",
          songCount: 2,
        }),
      ],
    });
  });

  it("creates a validated setlist", async () => {
    createSetlist.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Dimanche matin",
      items: [],
    });

    const response = await POST(
      new Request("http://localhost/api/setlists", {
        method: "POST",
        body: JSON.stringify({
          title: "Dimanche matin",
          songIds: [],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createSetlist).toHaveBeenCalledWith({
      title: "Dimanche matin",
      songIds: [],
    });
  });

  it("rejects invalid input before calling the service", async () => {
    const response = await POST(
      new Request("http://localhost/api/setlists", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createSetlist).not.toHaveBeenCalled();
  });
});
