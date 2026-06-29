export type MusicXmlLayoutMode = "original" | "custom";

export type MusicXmlDisplayAnalysis = {
  hasExplicitPageBreaks: boolean;
  hasExplicitSystemBreaks: boolean;
  removedArtifactLyricsCount: number;
  sanitizedXml: string;
};

const ARTIFACT_LYRIC_PATTERN =
  /^(?:\d+(?:st|nd|rd|th)|(?:maj|min|sus|add|dim|aug|m)(?![a-z])[a-z0-9#b/()+-]*|[a-g](?:[#b])?(?:maj|min|m|sus|add|dim|aug)(?![a-z])[a-z0-9#b/()+-]*)$/i;

const PRINT_NEW_SYSTEM_PATTERN = /<print\b[^>]*\bnew-system="yes"[^>]*\/?>/i;
const PRINT_NEW_PAGE_PATTERN = /<print\b[^>]*\bnew-page="yes"[^>]*\/?>/i;
const LYRIC_BLOCK_PATTERN = /<lyric\b[^>]*>[\s\S]*?<\/lyric>/gi;
const LYRIC_TEXT_PATTERN = /<text>([\s\S]*?)<\/text>/i;

function normalizeTextContent(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function isArtifactLyricText(text: string) {
  return ARTIFACT_LYRIC_PATTERN.test(normalizeTextContent(text));
}

export function analyzeMusicXmlDisplay(xml: string): MusicXmlDisplayAnalysis {
  let removedArtifactLyricsCount = 0;

  const sanitizedXml = xml.replaceAll(LYRIC_BLOCK_PATTERN, (lyricBlock) => {
    const lyricText = lyricBlock.match(LYRIC_TEXT_PATTERN)?.[1];

    if (!lyricText || !isArtifactLyricText(lyricText)) {
      return lyricBlock;
    }

    removedArtifactLyricsCount += 1;
    return "";
  });

  return {
    hasExplicitPageBreaks: PRINT_NEW_PAGE_PATTERN.test(xml),
    hasExplicitSystemBreaks: PRINT_NEW_SYSTEM_PATTERN.test(xml),
    removedArtifactLyricsCount,
    sanitizedXml,
  };
}
