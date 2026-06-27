import { describe, expect, it } from "vitest";

import {
  extractMusicXmlDefaultKey,
  generateChordProFromMusicXml,
} from "./musicxml-to-chordpro";

const sampleMusicXml = `<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <work>
    <work-title>Hosanna</work-title>
  </work>
  <identification>
    <creator type="composer">Auteur Exemple</creator>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>Voice</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <key>
          <fifths>3</fifths>
          <mode>major</mode>
        </key>
      </attributes>
      <harmony>
        <root><root-step>A</root-step></root>
        <kind>major</kind>
      </harmony>
      <note>
        <lyric><syllabic>begin</syllabic><text>Ho</text></lyric>
      </note>
      <note>
        <lyric><syllabic>end</syllabic><text>sanna</text></lyric>
      </note>
      <harmony>
        <root><root-step>B</root-step></root>
        <kind>major</kind>
      </harmony>
      <note>
        <lyric><syllabic>single</syllabic><text>Dieu</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe("musicxml to chordpro", () => {
  it("extracts a supported default key", () => {
    expect(extractMusicXmlDefaultKey(sampleMusicXml)).toBe("A");
  });

  it("generates chordpro content from lyrics and harmony", () => {
    const result = generateChordProFromMusicXml(sampleMusicXml);

    expect(result.defaultKey).toBe("A");
    expect(result.chordProContent).toContain("{title: Hosanna}");
    expect(result.chordProContent).toContain("{subtitle: Auteur Exemple}");
    expect(result.chordProContent).toContain("{key: A}");
    expect(result.chordProContent).toContain("[A]Hosanna [B]Dieu");
  });

  it("falls back to explicit options when metadata is missing", () => {
    const result = generateChordProFromMusicXml(
      `<score-partwise><part id="P1"><measure><note><lyric><text>Salut</text></lyric></note></measure></part></score-partwise>`,
      { title: "Titre manuel", defaultKey: "C" },
    );

    expect(result.chordProContent).toContain("{title: Titre manuel}");
    expect(result.chordProContent).toContain("{key: C}");
    expect(result.chordProContent).toContain("Salut");
  });
});
