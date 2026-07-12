import { describe, expect, it } from "vitest";

import { buildCalendarDays, formatTimeInput } from "./date-time-picker";

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

describe("event time input", () => {
  it("formats times in 24-hour notation", () => {
    expect(formatTimeInput("9")).toBe("9");
    expect(formatTimeInput("0930")).toBe("09:30");
    expect(formatTimeInput("23:59")).toBe("23:59");
  });
});
