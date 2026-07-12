import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateSetlistItemPersonalNote } = vi.hoisted(() => ({
  updateSetlistItemPersonalNote: vi.fn(),
}));

vi.mock("@/src/modules/setlists/services/setlist-management", () => ({
  updateSetlistItemPersonalNote,
}));

import { PUT } from "./route";

const context = { params: Promise.resolve({ id: "33333333-3333-4333-8333-333333333333", itemId: "11111111-1111-4111-8111-111111111111" }) };

describe("/api/setlists/:id/items/:itemId/personal-note", () => {
  beforeEach(() => updateSetlistItemPersonalNote.mockReset());

  it("saves an empty personal note to remove it", async () => {
    updateSetlistItemPersonalNote.mockResolvedValue(null);

    const response = await PUT(new Request("http://localhost/api/setlists/id/items/item/personal-note", {
      method: "PUT",
      body: JSON.stringify({ content: " " }),
    }), context);

    expect(response.status).toBe(200);
    expect(updateSetlistItemPersonalNote).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
      "",
    );
  });
});
