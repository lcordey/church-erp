import { afterEach, describe, expect, it, vi } from "vitest";

import { getSongRenderPreferencesSnapshot } from "./song-render-preferences-provider";

describe("song render preferences provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the same snapshot reference while storage is unchanged", () => {
    const storageValue = JSON.stringify({
      chordColor: "ink",
      chordFontScale: 0.94,
      lyricsFontScale: 1.12,
      lineHeight: 1.26,
      sourcePriority: ["musicxml", "pdf", "chordpro", "lyrics"],
    });

    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => storageValue),
      },
    });

    const firstSnapshot = getSongRenderPreferencesSnapshot();
    const secondSnapshot = getSongRenderPreferencesSnapshot();

    expect(secondSnapshot).toBe(firstSnapshot);
  });
});
