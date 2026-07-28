export class UnsafeMusicXmlError extends Error {
  constructor() {
    super("The MusicXML content contains an unsafe construct.");
  }
}

const forbiddenMusicXmlPatterns = [
  /<!ENTITY\b/i,
  /<\?xml-stylesheet\b/i,
  /<(?:embed|foreignObject|iframe|object|script)\b/i,
  /\bon[a-z]+\s*=/i,
  /\b(?:href|src)\s*=\s*["']\s*(?:data:|https?:|javascript:|\/\/)/i,
];

export function sanitizeMusicXml(content: string) {
  if (forbiddenMusicXmlPatterns.some((pattern) => pattern.test(content))) {
    throw new UnsafeMusicXmlError();
  }

  const withoutDoctype = content
    .replace(/<!DOCTYPE[\s\S]*?\]>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .trim();

  if (
    !withoutDoctype ||
    !/<score-(?:partwise|timewise)(?:\s|>)/i.test(withoutDoctype) ||
    /<!DOCTYPE\b/i.test(withoutDoctype)
  ) {
    throw new UnsafeMusicXmlError();
  }

  return withoutDoctype;
}
