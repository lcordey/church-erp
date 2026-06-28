import { describe, expect, it } from "vitest";

import {
  defaultSongRenderPreferences,
  readSongRenderPreferences,
} from "./song-render-preferences";

describe("song render preferences", () => {
  it("returns defaults when storage is empty", () => {
    expect(readSongRenderPreferences(null)).toEqual(
      defaultSongRenderPreferences,
    );
  });

  it("sanitizes invalid values from storage", () => {
    expect(
      readSongRenderPreferences(
        JSON.stringify({
          chordColor: "violet",
          chordFontScale: 4,
          lyricsFontScale: 0.4,
          lineHeight: 8,
        }),
      ),
    ).toEqual({
      chordColor: "warm",
      chordFontScale: 1.24,
      lyricsFontScale: 0.9,
      lineHeight: 1.5,
    });
  });

  it("keeps valid stored values", () => {
    expect(
      readSongRenderPreferences(
        JSON.stringify({
          chordColor: "ink",
          chordFontScale: 0.94,
          lyricsFontScale: 1.12,
          lineHeight: 1.26,
        }),
      ),
    ).toEqual({
      chordColor: "ink",
      chordFontScale: 0.94,
      lyricsFontScale: 1.12,
      lineHeight: 1.26,
    });
  });
});
