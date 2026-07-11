import { describe, expect, it } from "vitest";

import { validateEventInput } from "./event-input";

const userId = "11111111-1111-4111-8111-111111111111";

describe("event input", () => {
  it("accepts an extensible event with assignments", () => {
    const result = validateEventInput({
      title: " Culte du dimanche ",
      startsAt: "2026-07-12T08:30:00+02:00",
      endsAt: "2026-07-12T10:00:00+02:00",
      notes: "Accueil à 8 h.",
      setlistId: null,
      assignments: [{ userId, role: " Piano " }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Culte du dimanche");
      expect(result.data.assignments[0].role).toBe("Piano");
    }
  });

  it("rejects an end before the start and duplicate assignees", () => {
    const result = validateEventInput({
      title: "Culte",
      startsAt: "2026-07-12T10:00:00+02:00",
      endsAt: "2026-07-12T09:00:00+02:00",
      assignments: [{ userId }, { userId }],
    });
    expect(result).toMatchObject({ success: false, errors: { endsAt: expect.any(String), assignments: expect.any(String) } });
  });

  it("requires an explicit timezone", () => {
    expect(validateEventInput({ title: "Culte", startsAt: "2026-07-12T10:00", assignments: [] })).toMatchObject({ success: false, errors: { startsAt: expect.any(String) } });
  });
});
