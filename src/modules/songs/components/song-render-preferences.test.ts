import { describe, expect, it } from "vitest";

import {
  defaultSongRenderPreferences,
  readSongRenderPreferences,
  reorderSongSourcePriority,
  resolvePreferredSongSource,
  resolveSongSourceView,
  shiftSongSourcePriority,
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
          sourcePriority: ["pdf", "pdf", "unknown"],
        }),
      ),
    ).toEqual({
      chordColor: "warm",
      chordFontScale: 1.24,
      lyricsFontScale: 0.9,
      lineHeight: 1.5,
      sourcePriority: ["pdf", "lyrics", "chordpro", "musicxml"],
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
          sourcePriority: ["musicxml", "pdf", "chordpro", "lyrics"],
        }),
      ),
    ).toEqual({
      chordColor: "ink",
      chordFontScale: 0.94,
      lyricsFontScale: 1.12,
      lineHeight: 1.26,
      sourcePriority: ["musicxml", "pdf", "chordpro", "lyrics"],
    });
  });

  it("resolves the first available preferred source", () => {
    expect(
      resolvePreferredSongSource(
        ["musicxml", "pdf", "chordpro", "lyrics"],
        ["lyrics", "pdf"],
      ),
    ).toBe("pdf");
  });

  it("keeps the current source when the next song also supports it", () => {
    expect(
      resolveSongSourceView(
        "pdf",
        ["chordpro", "lyrics", "musicxml", "pdf"],
        ["lyrics", "pdf"],
      ),
    ).toBe("pdf");
  });

  it("falls back to the configured priority when the current source is unavailable", () => {
    expect(
      resolveSongSourceView(
        "musicxml",
        ["chordpro", "lyrics", "pdf", "musicxml"],
        ["lyrics", "pdf"],
      ),
    ).toBe("lyrics");
  });

  it("reorders a source before another source", () => {
    expect(
      reorderSongSourcePriority(
        ["lyrics", "chordpro", "pdf", "musicxml"],
        "musicxml",
        "chordpro",
      ),
    ).toEqual(["lyrics", "musicxml", "chordpro", "pdf"]);
  });

  it("moves a source by offset within the fixed priority list", () => {
    expect(
      shiftSongSourcePriority(
        ["lyrics", "chordpro", "pdf", "musicxml"],
        "chordpro",
        2,
      ),
    ).toEqual(["lyrics", "pdf", "musicxml", "chordpro"]);
  });
});
