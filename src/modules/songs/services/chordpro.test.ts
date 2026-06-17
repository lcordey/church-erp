import { describe, expect, it } from "vitest";

import { parseChordPro } from "./chordpro";

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
});
