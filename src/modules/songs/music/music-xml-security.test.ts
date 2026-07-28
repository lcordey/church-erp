import { describe, expect, it } from "vitest";

import { sanitizeMusicXml, UnsafeMusicXmlError } from "./music-xml-security";

describe("MusicXML security", () => {
  it("removes the standard external MusicXML doctype", () => {
    const content = `<?xml version="1.0"?>
      <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
      <score-partwise version="4.0"></score-partwise>`;

    const sanitized = sanitizeMusicXml(content);

    expect(sanitized).toContain("<score-partwise");
    expect(sanitized).not.toContain("<!DOCTYPE");
  });

  it.each([
    `<!DOCTYPE score-partwise [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><score-partwise>&xxe;</score-partwise>`,
    `<score-partwise><script>alert(1)</script></score-partwise>`,
    `<score-partwise><credit-words onclick="alert(1)">Titre</credit-words></score-partwise>`,
    `<score-partwise><image src="https://attacker.example/pixel" /></score-partwise>`,
    `<?xml-stylesheet href="https://attacker.example/xss.xsl"?><score-partwise></score-partwise>`,
  ])("rejects active or external content", (content) => {
    expect(() => sanitizeMusicXml(content)).toThrow(UnsafeMusicXmlError);
  });
});
