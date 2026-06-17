export type MusicNotation = "english" | "french";

export const musicalKeys = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "Bbm",
  "Bm",
] as const;

export type MusicalKey = (typeof musicalKeys)[number];

const frenchNotes: Record<string, string> = {
  C: "Do",
  D: "Ré",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

const chordRootPattern = /^([A-G])([#b]?)(.*)$/;
const canonicalRoots = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;
const pitchClassByRoot: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export function isMusicalKey(value: string): value is MusicalKey {
  return musicalKeys.includes(value as MusicalKey);
}

export function formatChord(
  chord: string,
  notation: MusicNotation,
): string {
  if (notation === "english") {
    return chord;
  }

  return chord
    .split("/")
    .map((part) => {
      const match = part.match(chordRootPattern);

      if (!match) {
        return part;
      }

      const [, root, accidental, suffix] = match;
      return `${frenchNotes[root]}${accidental}${suffix}`;
    })
    .join("/");
}

export function formatMusicalKey(
  key: string,
  notation: MusicNotation,
): string {
  return formatChord(key, notation);
}

function transposeChordPart(part: string, semitones: number): string {
  const match = part.match(chordRootPattern);

  if (!match) {
    return part;
  }

  const [, root, accidental, suffix] = match;
  const pitchClass = pitchClassByRoot[`${root}${accidental}`];

  if (pitchClass === undefined) {
    return part;
  }

  const transposedPitch = (pitchClass + semitones + 120) % 12;
  return `${canonicalRoots[transposedPitch]}${suffix}`;
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones % 12 === 0) {
    return chord;
  }

  return chord
    .split("/")
    .map((part) => transposeChordPart(part, semitones))
    .join("/");
}

export function getKeyTransposition(
  sourceKey: string,
  targetKey: string,
): number {
  const sourceMatch = sourceKey.match(chordRootPattern);
  const targetMatch = targetKey.match(chordRootPattern);

  if (!sourceMatch || !targetMatch) {
    return 0;
  }

  const sourcePitch = pitchClassByRoot[`${sourceMatch[1]}${sourceMatch[2]}`];
  const targetPitch = pitchClassByRoot[`${targetMatch[1]}${targetMatch[2]}`];

  if (sourcePitch === undefined || targetPitch === undefined) {
    return 0;
  }

  return (targetPitch - sourcePitch + 12) % 12;
}

export function getKeysForMode(key: string): readonly MusicalKey[] {
  return key.endsWith("m") ? musicalKeys.slice(12) : musicalKeys.slice(0, 12);
}
