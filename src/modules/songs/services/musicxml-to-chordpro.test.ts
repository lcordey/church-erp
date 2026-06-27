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
        <kind text="m">minor</kind>
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
    expect(result.chordProContent).toContain("[A]Hosanna [Bm]Dieu");
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

  it("keeps numbered lyric lines as separate verses", () => {
    const result = generateChordProFromMusicXml(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <harmony>
              <root><root-step>C</root-step></root>
              <kind>major</kind>
            </harmony>
            <note>
              <duration>1</duration>
              <lyric number="1"><syllabic>single</syllabic><text>Je</text></lyric>
              <lyric number="2"><syllabic>single</syllabic><text>Tu</text></lyric>
            </note>
            <note>
              <duration>1</duration>
              <lyric number="1"><syllabic>single</syllabic><text>chante</text></lyric>
              <lyric number="2"><syllabic>single</syllabic><text>chantes</text></lyric>
            </note>
          </measure>
          <measure number="2">
            <note>
              <duration>1</duration>
              <lyric number="1"><syllabic>single</syllabic><text>encore</text></lyric>
              <lyric number="2"><syllabic>single</syllabic><text>toujours</text></lyric>
            </note>
          </measure>
        </part>
      </score-partwise>
    `);

    expect(result.chordProContent).toContain(
      [
        "{start_of_verse: Couplet 1}",
        "[C]Je chante encore",
        "{end_of_verse}",
        "",
        "{start_of_verse: Couplet 2}",
        "[C]Tu chantes toujours",
        "{end_of_verse}",
      ].join("\n"),
    );
  });

  it("joins syllables and removes transcription hyphens inside words", () => {
    const result = generateChordProFromMusicXml(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <duration>1</duration>
              <lyric><syllabic>single</syllabic><text>A-mour</text></lyric>
            </note>
            <note>
              <duration>1</duration>
              <lyric><syllabic>begin</syllabic><text>mer</text></lyric>
            </note>
            <harmony>
              <root><root-step>G</root-step></root>
              <kind>major</kind>
            </harmony>
            <note>
              <duration>1</duration>
              <lyric><syllabic>end</syllabic><text>veille</text></lyric>
            </note>
          </measure>
        </part>
      </score-partwise>
    `);

    expect(result.chordProContent).toContain("Amour mer[G]veille");
    expect(result.chordProContent).not.toContain("A-mour");
  });

  it("uses printed systems instead of measures for lyric line breaks", () => {
    const result = generateChordProFromMusicXml(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note><duration>1</duration><lyric><text>Une</text></lyric></note>
          </measure>
          <measure number="2">
            <note><duration>1</duration><lyric><text>même</text></lyric></note>
          </measure>
          <measure number="3">
            <print new-system="yes" />
            <note><duration>1</duration><lyric><text>Nouvelle</text></lyric></note>
          </measure>
          <measure number="4">
            <note><duration>1</duration><lyric><text>ligne</text></lyric></note>
          </measure>
        </part>
      </score-partwise>
    `);

    expect(result.chordProContent).toContain(
      "Une même\nNouvelle ligne",
    );
    expect(result.chordProContent).not.toContain("Une\nmême");
  });
});
