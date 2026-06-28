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
    maj: "",
    major: "",
    min: "m",
    m: "m",
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

type Syllabic = "single" | "begin" | "middle" | "end";

type TimedHarmony = {
  chord: string;
  offset: number;
  order: number;
};

type TimedSyllable = {
  text: string;
  syllabic: Syllabic;
  verseId: string;
  offset: number;
  order: number;
};

type MusicSystem = {
  harmonies: TimedHarmony[];
  syllables: TimedSyllable[];
};

function extractAttribute(attributes: string, name: string) {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );

  return match ? cleanupText(match[1] ?? match[2]) : null;
}

function parseDuration(content: string) {
  const duration = extractFirst(content, /<duration>(-?\d+)<\/duration>/i);
  return duration ? Number.parseInt(duration, 10) : 0;
}

function normalizeSyllabic(value: string | null): Syllabic {
  const normalized = value?.toLowerCase();

  if (
    normalized === "begin" ||
    normalized === "middle" ||
    normalized === "end"
  ) {
    return normalized;
  }

  return "single";
}

function normalizeLyricText(value: string) {
  return cleanupText(value).replace(/(\p{L})-\s*(?=\p{L})/gu, "$1");
}

function extractNoteSyllables(
  noteXml: string,
  offset: number,
  order: number,
) {
  const syllables: TimedSyllable[] = [];

  for (const match of noteXml.matchAll(
    /<lyric\b([^>]*)>([\s\S]*?)<\/lyric>/gi,
  )) {
    const attributes = match[1];
    const lyricXml = match[2];
    const textParts = [...lyricXml.matchAll(/<text>([\s\S]*?)<\/text>/gi)]
      .map((textMatch) => cleanupText(textMatch[1]))
      .filter(Boolean);

    if (textParts.length === 0) {
      continue;
    }

    syllables.push({
      text: normalizeLyricText(textParts.join("")),
      syllabic: normalizeSyllabic(
        extractFirst(lyricXml, /<syllabic>(.*?)<\/syllabic>/i),
      ),
      verseId:
        extractAttribute(attributes, "number") ??
        extractAttribute(attributes, "name") ??
        "1",
      offset,
      order,
    });
  }

  return syllables;
}

function hasSystemContent(system: MusicSystem) {
  return system.harmonies.length > 0 || system.syllables.length > 0;
}

function startsNewSystem(measureXml: string) {
  return /<print\b[^>]*(?:new-system|new-page)\s*=\s*(?:"yes"|'yes')[^>]*\/?>/i.test(
    measureXml,
  );
}

function extractPreferredPart(content: string) {
  const parts = [...content.matchAll(/<part\b[^>]*>([\s\S]*?)<\/part>/gi)]
    .map((match) => match[1]);

  if (parts.length === 0) {
    return null;
  }

  return parts.reduce((preferred, part) => {
    const preferredLyrics = [...preferred.matchAll(/<lyric\b/gi)].length;
    const partLyrics = [...part.matchAll(/<lyric\b/gi)].length;
    return partLyrics > preferredLyrics ? part : preferred;
  });
}

function extractPartVerseIds(part: string) {
  return [
    ...new Set(
      [...part.matchAll(/<lyric\b([^>]*)>/gi)]
        .map((match) =>
          extractAttribute(match[1], "number") ??
          extractAttribute(match[1], "name") ??
          "1"
        )
        .filter(Boolean),
    ),
  ].sort(compareVerseIds);
}

function extractMusicSystems(content: string) {
  const part = extractPreferredPart(content);

  if (!part) {
    return [];
  }

  const systems: MusicSystem[] = [{ harmonies: [], syllables: [] }];
  let currentSystem = systems[0];
  let absoluteOffset = 0;
  let eventOrder = 0;

  for (const measureMatch of part.matchAll(
    /<measure\b[^>]*>([\s\S]*?)<\/measure>/gi,
  )) {
    const measureXml = measureMatch[1];

    if (startsNewSystem(measureXml) && hasSystemContent(currentSystem)) {
      currentSystem = { harmonies: [], syllables: [] };
      systems.push(currentSystem);
    }

    let cursor = 0;
    let furthestOffset = 0;
    let lastNoteOffset = 0;

    for (const eventMatch of measureXml.matchAll(
      /<harmony\b[\s\S]*?<\/harmony>|<note\b[\s\S]*?<\/note>|<backup\b[\s\S]*?<\/backup>|<forward\b[\s\S]*?<\/forward>/gi,
    )) {
      const eventXml = eventMatch[0];
      eventOrder += 1;

      if (/^<harmony\b/i.test(eventXml)) {
        const chord = extractHarmonyChord(eventXml);
        const harmonyOffsetValue = extractFirst(
          eventXml,
          /<offset\b[^>]*>(-?\d+)<\/offset>/i,
        );
        const harmonyOffset = harmonyOffsetValue
          ? Number.parseInt(harmonyOffsetValue, 10)
          : 0;

        if (chord) {
          currentSystem.harmonies.push({
            chord,
            offset: absoluteOffset + cursor + harmonyOffset,
            order: eventOrder,
          });
        }

        continue;
      }

      if (/^<backup\b/i.test(eventXml)) {
        cursor = Math.max(0, cursor - parseDuration(eventXml));
        continue;
      }

      if (/^<forward\b/i.test(eventXml)) {
        cursor += parseDuration(eventXml);
        furthestOffset = Math.max(furthestOffset, cursor);
        continue;
      }

      const isChordNote = /<chord\s*\/>/i.test(eventXml);
      const noteOffset = isChordNote ? lastNoteOffset : cursor;

      currentSystem.syllables.push(
        ...extractNoteSyllables(
          eventXml,
          absoluteOffset + noteOffset,
          eventOrder,
        ),
      );

      if (!isChordNote) {
        lastNoteOffset = noteOffset;
        cursor += parseDuration(eventXml);
        furthestOffset = Math.max(furthestOffset, cursor);
      }
    }

    absoluteOffset += Math.max(furthestOffset, cursor, 1);
  }

  return systems.filter(hasSystemContent);
}

function compareVerseIds(left: string, right: string) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function getSystemVerseIds(system: MusicSystem) {
  return [...new Set(system.syllables.map((syllable) => syllable.verseId))]
    .sort(compareVerseIds);
}

function comesAfterHarmony(
  syllable: TimedSyllable,
  harmony: TimedHarmony,
) {
  return (
    syllable.offset > harmony.offset ||
    (syllable.offset === harmony.offset && syllable.order > harmony.order)
  );
}

function buildChordProLine(
  syllables: TimedSyllable[],
  harmonies: TimedHarmony[],
) {
  if (syllables.length === 0) {
    return harmonies.map(({ chord }) => `[${chord}]`).join(" ");
  }

  const chordPrefixes = syllables.map(() => [] as string[]);
  const trailingChords: string[] = [];

  for (const harmony of harmonies) {
    const syllableIndex = syllables.findIndex((syllable) =>
      comesAfterHarmony(syllable, harmony),
    );

    if (syllableIndex === -1) {
      trailingChords.push(harmony.chord);
    } else {
      chordPrefixes[syllableIndex].push(harmony.chord);
    }
  }

  let line = "";
  let wordOpen = false;
  let previousText = "";

  for (let index = 0; index < syllables.length; index += 1) {
    const syllable = syllables[index];
    const text = normalizeLyricText(syllable.text);

    if (!text) {
      continue;
    }

    const joinsPreviousWord =
      wordOpen && syllable.syllabic !== "begin";
    const startsWithPunctuation = /^[,.;:!?…)\]}]/u.test(text);
    const followsApostrophe = /['’]$/u.test(previousText);

    if (
      line &&
      !joinsPreviousWord &&
      !startsWithPunctuation &&
      !followsApostrophe
    ) {
      line += " ";
    }

    line += chordPrefixes[index]
      .map((chord) => `[${chord}]`)
      .join("");
    line += text;

    wordOpen =
      syllable.syllabic === "begin" || syllable.syllabic === "middle";
    previousText = text;
  }

  if (trailingChords.length > 0) {
    line += `${line ? " " : ""}${trailingChords
      .map((chord) => `[${chord}]`)
      .join(" ")}`;
  }

  return line.trim();
}

function buildSystemLines(system: MusicSystem) {
  return new Map(
    getSystemVerseIds(system).map((verseId) => [
      verseId,
      buildChordProLine(
        system.syllables.filter(
          (syllable) => syllable.verseId === verseId,
        ),
        system.harmonies,
      ),
    ]),
  );
}

function buildChordProBody(systems: MusicSystem[]) {
  const blocks: string[] = [];
  let systemIndex = 0;

  while (systemIndex < systems.length) {
    const verseIds = getSystemVerseIds(systems[systemIndex]);

    if (verseIds.length > 1) {
      let parallelEnd = systemIndex + 1;

      while (
        parallelEnd < systems.length &&
        getSystemVerseIds(systems[parallelEnd]).length > 1
      ) {
        parallelEnd += 1;
      }

      const parallelSystems = systems.slice(systemIndex, parallelEnd);
      const parallelVerseIds = [
        ...new Set(parallelSystems.flatMap(getSystemVerseIds)),
      ].sort(compareVerseIds);

      for (const verseId of parallelVerseIds) {
        const lines = parallelSystems
          .map((system) => buildSystemLines(system).get(verseId))
          .filter((line): line is string => Boolean(line));

        if (lines.length > 0) {
          blocks.push(
            [
              `{start_of_verse: Couplet ${verseId}}`,
              ...lines,
              "{end_of_verse}",
            ].join("\n"),
          );
        }
      }

      systemIndex = parallelEnd;
      continue;
    }

    const lines: string[] = [];

    while (
      systemIndex < systems.length &&
      getSystemVerseIds(systems[systemIndex]).length <= 1
    ) {
      const system = systems[systemIndex];
      const [verseId] = getSystemVerseIds(system);
      const line = verseId
        ? buildSystemLines(system).get(verseId)
        : buildChordProLine([], system.harmonies);

      if (line) {
        lines.push(line);
      }

      systemIndex += 1;
    }

    if (lines.length > 0) {
      blocks.push(lines.join("\n"));
    }
  }

  return blocks.join("\n\n");
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
  const body = buildChordProBody(extractMusicSystems(content));

  if (!body) {
    throw new Error("The MusicXML file does not contain any renderable lyrics or harmony.");
  }

  return {
    chordProContent: [
      `{title: ${title}}`,
      author ? `{subtitle: ${author}}` : null,
      defaultKey ? `{key: ${defaultKey}}` : null,
      "",
      body,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    defaultKey,
  };
}

function extractVerseSyllables(noteXml: string, verseId: string) {
  const syllables: { text: string; syllabic: Syllabic }[] = [];

  for (const match of noteXml.matchAll(
    /<lyric\b([^>]*)>([\s\S]*?)<\/lyric>/gi,
  )) {
    const attributes = match[1];
    const lyricXml = match[2];
    const lyricVerseId =
      extractAttribute(attributes, "number") ??
      extractAttribute(attributes, "name") ??
      "1";

    if (lyricVerseId !== verseId) {
      continue;
    }

    const textParts = [...lyricXml.matchAll(/<text>([\s\S]*?)<\/text>/gi)]
      .map((textMatch) => cleanupText(textMatch[1]))
      .filter(Boolean);

    if (textParts.length === 0) {
      continue;
    }

    syllables.push({
      text: normalizeLyricText(textParts.join("")),
      syllabic: normalizeSyllabic(
        extractFirst(lyricXml, /<syllabic>(.*?)<\/syllabic>/i),
      ),
    });
  }

  return syllables;
}

function buildIronssVerseLines(part: string, verseId: string) {
  const measures = [...part.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/gi)];
  const lines: string[] = [];
  let currentLine = "";
  let currentSyllabic: Syllabic = "single";

  for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
    const measureXml = measures[measureIndex][1];

    for (const eventMatch of measureXml.matchAll(
      /<harmony\b[\s\S]*?<\/harmony>|<note\b[\s\S]*?<\/note>/gi,
    )) {
      const eventXml = eventMatch[0];

      if (/^<harmony\b/i.test(eventXml)) {
        const chord = extractHarmonyChord(eventXml);

        if (!chord) {
          continue;
        }

        if (
          currentLine &&
          (currentSyllabic === "begin" || currentSyllabic === "middle")
        ) {
          currentLine += "-";
        }

        currentLine += `[${chord}]`;
        continue;
      }

      const syllables = extractVerseSyllables(eventXml, verseId);

      for (const syllable of syllables) {
        currentLine += syllable.text;
        currentSyllabic = syllable.syllabic;

        if (
          syllable.syllabic === "single" ||
          syllable.syllabic === "end"
        ) {
          currentLine += " ";
        }
      }
    }

    if ((measureIndex + 1) % 4 === 0) {
      const trimmedLine = currentLine.trim();

      if (trimmedLine) {
        lines.push(trimmedLine);
      }

      currentLine = "";
      currentSyllabic = "single";
    }
  }

  const trailingLine = currentLine.trim();

  if (trailingLine) {
    lines.push(trailingLine);
  }

  return lines;
}

export function generateChordProFromMusicXmlWithIronssAlgorithm(
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
  const part = extractPreferredPart(content);

  if (!part) {
    throw new Error("The MusicXML file does not contain any renderable lyrics or harmony.");
  }

  const verseIds = extractPartVerseIds(part);
  const blocks = verseIds
    .map((verseId) => {
      const lines = buildIronssVerseLines(part, verseId);

      if (lines.length === 0) {
        return null;
      }

      if (verseIds.length === 1) {
        return lines.join("\n");
      }

      return [
        `{start_of_verse: Couplet ${verseId}}`,
        ...lines,
        "{end_of_verse}",
      ].join("\n");
    })
    .filter((block): block is string => block !== null)
    .join("\n\n");

  if (!blocks) {
    throw new Error("The MusicXML file does not contain any renderable lyrics or harmony.");
  }

  return {
    chordProContent: [
      `{title: ${title}}`,
      author ? `{subtitle: ${author}}` : null,
      defaultKey ? `{key: ${defaultKey}}` : null,
      "",
      blocks,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    defaultKey,
  };
}
