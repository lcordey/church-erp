function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function cleanupText(value: string) {
  return decodeXmlEntities(value).replace(/\s+/g, " ").trim();
}

function extractFirst(content: string, pattern: RegExp) {
  const match = content.match(pattern);
  return match ? cleanupText(match[1]) : null;
}

function alterToAccidental(value: number | null) {
  if (value === 1) {
    return "#";
  }

  if (value === -1) {
    return "b";
  }

  return "";
}

function normalizeKind(kind: string | null) {
  const normalized = kind?.toLowerCase() ?? "major";
  const mapping: Record<string, string> = {
    major: "",
    minor: "m",
    augmented: "aug",
    diminished: "dim",
    dominant: "7",
    "dominant-seventh": "7",
    "major-seventh": "maj7",
    "minor-seventh": "m7",
    "minor-major-seventh": "m(maj7)",
    "half-diminished": "m7b5",
    suspended: "sus",
    "suspended-second": "sus2",
    "suspended-fourth": "sus4",
    power: "5",
    none: "",
  };

  return mapping[normalized] ?? "";
}

function extractHarmonyChord(harmonyXml: string) {
  const rootStep = extractFirst(harmonyXml, /<root-step>(.*?)<\/root-step>/i);

  if (!rootStep) {
    return null;
  }

  const rootAlterValue = extractFirst(harmonyXml, /<root-alter>(.*?)<\/root-alter>/i);
  const rootAlter = rootAlterValue ? Number.parseInt(rootAlterValue, 10) : null;
  const kindText =
    extractFirst(harmonyXml, /<kind[^>]*text="([^"]+)"[^>]*>/i) ??
    extractFirst(harmonyXml, /<kind[^>]*>(.*?)<\/kind>/i);
  const bassStep = extractFirst(harmonyXml, /<bass-step>(.*?)<\/bass-step>/i);
  const bassAlterValue = extractFirst(harmonyXml, /<bass-alter>(.*?)<\/bass-alter>/i);
  const bassAlter = bassAlterValue ? Number.parseInt(bassAlterValue, 10) : null;

  const root = `${rootStep}${alterToAccidental(rootAlter)}`;
  const kind = normalizeKind(kindText);
  const bass = bassStep
    ? `/${bassStep}${alterToAccidental(bassAlter)}`
    : "";

  return `${root}${kind}${bass}`;
}

function extractSyllableText(lyricXml: string) {
  const text = extractFirst(lyricXml, /<text>([\s\S]*?)<\/text>/i);
  const syllabic = extractFirst(lyricXml, /<syllabic>(.*?)<\/syllabic>/i);

  if (!text) {
    return null;
  }

  return {
    text,
    syllabic: syllabic?.toLowerCase() ?? "single",
  };
}

function extractMeasureTokens(measureXml: string) {
  return [...measureXml.matchAll(/<harmony\b[\s\S]*?<\/harmony>|<lyric\b[\s\S]*?<\/lyric>/gi)]
    .map((match) => match[0]);
}

function wordsFromMeasure(measureXml: string) {
  const words: string[] = [];
  const chords: string[] = [];
  let pendingWord = "";

  for (const token of extractMeasureTokens(measureXml)) {
    if (token.startsWith("<harmony")) {
      const chord = extractHarmonyChord(token);

      if (chord) {
        chords.push(chord);
      }

      continue;
    }

    const syllable = extractSyllableText(token);

    if (!syllable) {
      continue;
    }

    if (syllable.syllabic === "begin") {
      pendingWord = syllable.text;
      continue;
    }

    if (syllable.syllabic === "middle") {
      pendingWord += syllable.text;
      continue;
    }

    if (syllable.syllabic === "end") {
      pendingWord += syllable.text;
      const word = cleanupText(pendingWord);

      if (word) {
        words.push(word);
      }

      pendingWord = "";
      continue;
    }

    if (pendingWord) {
      const word = cleanupText(`${pendingWord}${syllable.text}`);

      if (word) {
        words.push(word);
      }

      pendingWord = "";
      continue;
    }

    words.push(syllable.text);
  }

  if (pendingWord) {
    const word = cleanupText(pendingWord);

    if (word) {
      words.push(word);
    }
  }

  return { words, chords };
}

function buildChordProLine(words: string[], chords: string[]) {
  if (words.length === 0 && chords.length === 0) {
    return null;
  }

  if (words.length === 0) {
    return chords.map((chord) => `[${chord}]`).join(" ");
  }

  const parts: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const chord = chords[index];

    parts.push(chord ? `[${chord}]${words[index]}` : words[index]);
  }

  for (let index = words.length; index < chords.length; index += 1) {
    parts.push(`[${chords[index]}]`);
  }

  return parts.join(" ").trim();
}

function extractPartMeasures(content: string) {
  const partMatch = content.match(/<part\b[\s\S]*?>([\s\S]*?)<\/part>/i);

  if (!partMatch) {
    return [];
  }

  return [...partMatch[1].matchAll(/<measure\b[\s\S]*?>([\s\S]*?)<\/measure>/gi)]
    .map((match) => match[1]);
}

function toSupportedKey(fifths: number, mode: string) {
  const majorKeys: Record<number, string> = {
    [-7]: "B",
    [-6]: "F#",
    [-5]: "Db",
    [-4]: "Ab",
    [-3]: "Eb",
    [-2]: "Bb",
    [-1]: "F",
    [0]: "C",
    [1]: "G",
    [2]: "D",
    [3]: "A",
    [4]: "E",
    [5]: "B",
    [6]: "F#",
    [7]: "Db",
  };
  const minorKeys: Record<number, string> = {
    [-7]: "G#m",
    [-6]: "Ebm",
    [-5]: "Bbm",
    [-4]: "Fm",
    [-3]: "Cm",
    [-2]: "Gm",
    [-1]: "Dm",
    [0]: "Am",
    [1]: "Em",
    [2]: "Bm",
    [3]: "F#m",
    [4]: "C#m",
    [5]: "G#m",
    [6]: "Ebm",
    [7]: "Bbm",
  };

  return mode === "minor" ? minorKeys[fifths] ?? null : majorKeys[fifths] ?? null;
}

export function extractMusicXmlDefaultKey(content: string) {
  const fifths = extractFirst(content, /<fifths>(-?\d+)<\/fifths>/i);

  if (!fifths) {
    return null;
  }

  const mode = extractFirst(content, /<mode>(major|minor)<\/mode>/i) ?? "major";

  return toSupportedKey(Number.parseInt(fifths, 10), mode);
}

export function generateChordProFromMusicXml(
  content: string,
  options?: {
    title?: string | null;
    author?: string | null;
    defaultKey?: string | null;
  },
) {
  const title =
    extractFirst(content, /<work-title>([\s\S]*?)<\/work-title>/i) ??
    extractFirst(content, /<movement-title>([\s\S]*?)<\/movement-title>/i) ??
    options?.title ??
    "Chant";
  const author =
    extractFirst(content, /<creator[^>]*>([\s\S]*?)<\/creator>/i) ??
    options?.author ??
    null;
  const defaultKey = extractMusicXmlDefaultKey(content) ?? options?.defaultKey ?? null;
  const lines = extractPartMeasures(content)
    .map(wordsFromMeasure)
    .map(({ words, chords }) => buildChordProLine(words, chords))
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    throw new Error("The MusicXML file does not contain any renderable lyrics or harmony.");
  }

  return {
    chordProContent: [
      `{title: ${title}}`,
      author ? `{subtitle: ${author}}` : null,
      defaultKey ? `{key: ${defaultKey}}` : null,
      "",
      ...lines,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    defaultKey,
  };
}
