import { describe, expect, it } from "vitest";

import { isCatalogFilterActive } from "./song-catalog";
import { normalizeSelectedFilterValues } from "./use-song-catalog-query";

describe("song catalog filters", () => {
  it("treats no selection as no effective filter", () => {
    expect(normalizeSelectedFilterValues([], ["JEM", "LeMont"])).toEqual([]);
    expect(isCatalogFilterActive([], ["JEM", "LeMont"])).toBe(false);
  });

  it("treats a full selection as no effective filter", () => {
    expect(
      normalizeSelectedFilterValues(["JEM", "LeMont"], ["JEM", "LeMont"]),
    ).toEqual([]);
    expect(isCatalogFilterActive(["JEM", "LeMont"], ["JEM", "LeMont"])).toBe(
      false,
    );
  });

  it("keeps a partial selection as an active filter", () => {
    expect(
      normalizeSelectedFilterValues(["JEM"], ["JEM", "LeMont"]),
    ).toEqual(["JEM"]);
    expect(isCatalogFilterActive(["JEM"], ["JEM", "LeMont"])).toBe(true);
  });
});
