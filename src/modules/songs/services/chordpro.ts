export type ChordProSegment = {
  chord: string | null;
  lyrics: string;
};

export type ChordProLine =
  | { type: "blank" }
  | { type: "section"; label: string }
  | { type: "lyrics"; segments: ChordProSegment[] };

const directivePattern = /^\{([^:}]+)(?::\s*(.*))?\}$/;
const sectionDirectives = new Set([
  "start_of_chorus",
  "soc",
  "start_of_verse",
  "sov",
  "start_of_bridge",
  "sob",
]);

function humanizeSection(value: string) {
  const labels: Record<string, string> = {
    chorus: "Refrain",
    verse: "Couplet",
    bridge: "Pont",
  };

  return labels[value.toLowerCase()] ?? value;
}

function parseLyricsLine(line: string): ChordProSegment[] {
  const segments: ChordProSegment[] = [];
  const chordPattern = /\[([^\]]+)\]/g;
  let chord: string | null = null;
  let cursor = 0;

  for (const match of line.matchAll(chordPattern)) {
    const index = match.index ?? 0;
    const lyrics = line.slice(cursor, index);

    if (lyrics || chord) {
      segments.push({ chord, lyrics });
    }

    chord = match[1].trim();
    cursor = index + match[0].length;
  }

  const remainingLyrics = line.slice(cursor);
  segments.push({ chord, lyrics: remainingLyrics || " " });

  return segments;
}

export function parseChordPro(content: string): ChordProLine[] {
  const lines: ChordProLine[] = [];
  let pendingComment: string | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    if (!line) {
      if (pendingComment) {
        lines.push({ type: "section", label: pendingComment });
        pendingComment = null;
      }

      lines.push({ type: "blank" });
      continue;
    }

    const directive = line.match(directivePattern);

    if (directive) {
      const name = directive[1].toLowerCase();
      const value = directive[2]?.trim();

      if (sectionDirectives.has(name)) {
        const fallback = name.includes("chorus")
          ? "Refrain"
          : name.includes("bridge")
            ? "Pont"
            : "Couplet";

        lines.push({
          type: "section",
          label: pendingComment ?? (value ? humanizeSection(value) : fallback),
        });
        pendingComment = null;
        continue;
      }

      if (name === "comment" || name === "c") {
        pendingComment = value ?? null;
        continue;
      }

      continue;
    }

    if (pendingComment) {
      lines.push({ type: "section", label: pendingComment });
      pendingComment = null;
    }

    lines.push({ type: "lyrics", segments: parseLyricsLine(line) });
  }

  if (pendingComment) {
    lines.push({ type: "section", label: pendingComment });
  }

  return lines;
}
