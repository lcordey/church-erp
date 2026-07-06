import { describe, expect, it } from "vitest";

import {
  groupChordProSegmentsForWrap,
  hasChordProChords,
  hasChordProLyrics,
  parseChordPro,
} from "./chordpro";

describe("parseChordPro", () => {
  it("ignores document metadata and separates chords from lyrics", () => {
    const lines = parseChordPro(`{title: Exemple}
{key: D}
[D]Que ma bouche [G]chante`);

    expect(lines).toEqual([
      {
        type: "lyrics",
        segments: [
          { chord: "D", lyrics: "Que ma bouche " },
          { chord: "G", lyrics: "chante" },
        ],
      },
    ]);
  });

  it("translates common section directives for the French UI", () => {
    const lines = parseChordPro(`{start_of_chorus}
[C]Refrain
{end_of_chorus}`);

    expect(lines[0]).toEqual({ type: "section", label: "Refrain" });
    expect(lines[1]).toMatchObject({ type: "lyrics" });
    expect(lines).toHaveLength(2);
  });

  it("keeps custom section labels from named directives", () => {
    const lines = parseChordPro(`{start_of_verse: Couplet 1}
[C]Ligne
{end_of_verse}`);

    expect(lines[0]).toEqual({ type: "section", label: "Couplet 1" });
    expect(lines[1]).toMatchObject({ type: "lyrics" });
    expect(lines).toHaveLength(2);
  });

  it("uses a preceding comment as the visible label for a section", () => {
    const lines = parseChordPro(`{c: Refrain}
{start_of_chorus}
[C]Ligne
{end_of_chorus}`);

    expect(lines[0]).toEqual({ type: "section", label: "Refrain" });
    expect(lines[1]).toMatchObject({ type: "lyrics" });
    expect(lines).toHaveLength(2);
  });

  it("detects when a ChordPro source contains chords", () => {
    expect(hasChordProChords("[C]Ligne")).toBe(true);
    expect(hasChordProChords("Ligne sans accord")).toBe(false);
  });

  it("only detects lyrics when the source contains visible words", () => {
    expect(hasChordProLyrics("{title: Exemple}\n{key: C}")).toBe(false);
    expect(hasChordProLyrics("{comment: Intro}\n[C]")).toBe(false);
    expect(hasChordProLyrics("{title: Exemple}\n[C]Paroles")).toBe(true);
  });

  it("keeps a chorded word in one wrap group", () => {
    const lines = parseChordPro("[G]mer[G/B]veille [C]encore");

    expect(lines[0]).toMatchObject({ type: "lyrics" });

    const groups = groupChordProSegmentsForWrap(
      lines[0].type === "lyrics" ? lines[0].segments : [],
    );

    expect(groups).toEqual([
      [
        { chord: "G", lyrics: "mer" },
        { chord: "G/B", lyrics: "veille" },
        { chord: null, lyrics: " " },
      ],
      [{ chord: "C", lyrics: "encore" }],
    ]);
  });
});
