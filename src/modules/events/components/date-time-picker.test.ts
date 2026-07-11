import { describe, expect, it } from "vitest";

import { buildCalendarDays } from "./date-time-picker";

describe("event calendar", () => {
  it("builds complete Monday-first calendar weeks", () => {
    const days = buildCalendarDays(2026, 6);

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ dateKey: "2026-06-29", dayNumber: 29 });
    expect(days[2]).toMatchObject({
      dateKey: "2026-07-01",
      dayNumber: 1,
      inCurrentMonth: true,
    });
    expect(days[41].dateKey).toBe("2026-08-09");
  });
});
