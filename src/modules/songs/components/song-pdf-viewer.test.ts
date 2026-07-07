import { describe, expect, it } from "vitest";

import { resolvePdfRenderScale } from "./song-pdf-viewer";

describe("resolvePdfRenderScale", () => {
  it("keeps the preferred scale for ordinary pages", () => {
    expect(
      resolvePdfRenderScale({
        devicePixelRatio: 2,
        displayScale: 0.8,
        viewportHeight: 792,
        viewportWidth: 612,
      }),
    ).toBe(1.6);
  });

  it("caps the render scale when the target canvas would be too large", () => {
    expect(
      resolvePdfRenderScale({
        devicePixelRatio: 2,
        displayScale: 1.5,
        viewportHeight: 6000,
        viewportWidth: 4000,
      }),
    ).toBeCloseTo(0.418, 3);
  });
});
