import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateSetlistItemTeamNote } = vi.hoisted(() => ({
  updateSetlistItemTeamNote: vi.fn(),
}));

vi.mock("@/src/modules/setlists/services/setlist-management", () => ({
  updateSetlistItemTeamNote,
}));

import { PUT } from "./route";

const context = { params: Promise.resolve({ id: "33333333-3333-4333-8333-333333333333", itemId: "11111111-1111-4111-8111-111111111111" }) };

describe("/api/setlists/:id/items/:itemId/team-note", () => {
  beforeEach(() => updateSetlistItemTeamNote.mockReset());

  it("validates then saves a team note", async () => {
    updateSetlistItemTeamNote.mockResolvedValue(null);

    const response = await PUT(new Request("http://localhost/api/setlists/id/items/item/team-note", {
      method: "PUT",
      body: JSON.stringify({ content: "  Reprendre le refrain. " }),
    }), context);

    expect(response.status).toBe(200);
    expect(updateSetlistItemTeamNote).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
      "Reprendre le refrain.",
    );
  });

  it("rejects invalid input before calling the service", async () => {
    const response = await PUT(new Request("http://localhost/api/setlists/id/items/item/team-note", {
      method: "PUT",
      body: JSON.stringify({}),
    }), context);

    expect(response.status).toBe(400);
    expect(updateSetlistItemTeamNote).not.toHaveBeenCalled();
  });
});
