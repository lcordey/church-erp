import { describe, expect, it } from "vitest";

import { analyzeMusicXmlDisplay } from "./music-xml-display";

describe("analyzeMusicXmlDisplay", () => {
  it("detects source layout hints", () => {
    const xml = `
      <score-partwise>
        <part id="P1">
          <measure number="1"><print new-system="yes" /></measure>
          <measure number="2"><print new-page="yes" /></measure>
        </part>
      </score-partwise>
    `;

    expect(analyzeMusicXmlDisplay(xml)).toMatchObject({
      hasExplicitSystemBreaks: true,
      hasExplicitPageBreaks: true,
    });
  });

  it("removes chord-artifact lyrics and keeps real alternate lyrics", () => {
    const xml = `
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <lyric number="1"><text>Quel</text></lyric>
              <lyric number="2"><text>Maj7(add9)</text></lyric>
            </note>
            <note>
              <lyric number="1"><text>moi.</text></lyric>
              <lyric number="2"><text>pour</text></lyric>
            </note>
            <note>
              <lyric number="2"><text>2nd</text></lyric>
            </note>
          </measure>
        </part>
      </score-partwise>
    `;

    const analysis = analyzeMusicXmlDisplay(xml);

    expect(analysis.removedArtifactLyricsCount).toBe(2);
    expect(analysis.sanitizedXml).toContain("<text>Quel</text>");
    expect(analysis.sanitizedXml).toContain("<text>pour</text>");
    expect(analysis.sanitizedXml).not.toContain("Maj7(add9)");
    expect(analysis.sanitizedXml).not.toContain("2nd");
  });

  it("does not mistake French lyrics starting with chord-quality letters for artifacts", () => {
    const xml = `
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note><lyric number="1"><text>mour</text></lyric></note>
            <note><lyric number="1"><text>mon</text></lyric></note>
            <note><lyric number="1"><text>dimanche</text></lyric></note>
            <note><lyric number="1"><text>addition</text></lyric></note>
            <note><lyric number="2"><text>m7</text></lyric></note>
            <note><lyric number="2"><text>C#m7</text></lyric></note>
          </measure>
        </part>
      </score-partwise>
    `;

    const analysis = analyzeMusicXmlDisplay(xml);

    expect(analysis.removedArtifactLyricsCount).toBe(2);
    expect(analysis.sanitizedXml).toContain("<text>mour</text>");
    expect(analysis.sanitizedXml).toContain("<text>mon</text>");
    expect(analysis.sanitizedXml).toContain("<text>dimanche</text>");
    expect(analysis.sanitizedXml).toContain("<text>addition</text>");
    expect(analysis.sanitizedXml).not.toContain("<text>m7</text>");
    expect(analysis.sanitizedXml).not.toContain("<text>C#m7</text>");
  });
});
