import { describe, expect, it } from "vitest";

import { getSongCatalogIdentifierSearch } from "./song-catalog-repository";

describe("song catalog identifier search", () => {
  it("does not treat a bare collection code as a collection-number search", () => {
    expect(getSongCatalogIdentifierSearch("jem")).toBeNull();
    expect(getSongCatalogIdentifierSearch(" JEM ")).toBeNull();
  });

  it("keeps collection-number searches when a number is present", () => {
    expect(getSongCatalogIdentifierSearch("jem 12")).toBe("jem12");
    expect(getSongCatalogIdentifierSearch("JEM001")).toBe("jem001");
    expect(getSongCatalogIdentifierSearch("001")).toBe("001");
  });
});
