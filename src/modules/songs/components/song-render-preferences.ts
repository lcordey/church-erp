export const songRenderPreferenceStorageKey =
  "church-erp-song-render-preferences";

export const songRenderPreferenceChangeEvent =
  "church-erp-song-render-preferences-change";

export const chordColorOptions = ["warm", "accent", "ink"] as const;
export const songSourceViewOptions = [
  "lyrics",
  "chordpro",
  "pdf",
  "musicxml",
] as const;

export type ChordColorPreference = (typeof chordColorOptions)[number];
export type SongSourceView = (typeof songSourceViewOptions)[number];

export type SongRenderPreferences = {
  chordColor: ChordColorPreference;
  chordFontScale: number;
  lyricsFontScale: number;
  lineHeight: number;
  sourcePriority: SongSourceView[];
};

export type SongSourcePriorityPlacement = "before" | "after";

export const defaultSongRenderPreferences: SongRenderPreferences = {
  chordColor: "warm",
  chordFontScale: 0.82,
  lyricsFontScale: 1,
  lineHeight: 1.18,
  sourcePriority: ["lyrics", "chordpro", "pdf", "musicxml"],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSourcePriority(value: unknown): SongSourceView[] {
  if (!Array.isArray(value)) {
    return defaultSongRenderPreferences.sourcePriority;
  }

  const uniqueValidValues = value.filter(
    (item, index): item is SongSourceView =>
      songSourceViewOptions.includes(item as SongSourceView) &&
      value.indexOf(item) === index,
  );

  return [
    ...uniqueValidValues,
    ...songSourceViewOptions.filter((option) => !uniqueValidValues.includes(option)),
  ];
}

export function normalizeSongRenderPreferences(
  value: unknown,
): SongRenderPreferences {
  if (!value || typeof value !== "object") {
    return defaultSongRenderPreferences;
  }

  const candidate = value as Partial<Record<keyof SongRenderPreferences, unknown>>;

  return {
    chordColor: chordColorOptions.includes(
      candidate.chordColor as ChordColorPreference,
    )
      ? (candidate.chordColor as ChordColorPreference)
      : defaultSongRenderPreferences.chordColor,
    chordFontScale:
      typeof candidate.chordFontScale === "number"
        ? clamp(candidate.chordFontScale, 0.68, 1.24)
        : defaultSongRenderPreferences.chordFontScale,
    lyricsFontScale:
      typeof candidate.lyricsFontScale === "number"
        ? clamp(candidate.lyricsFontScale, 0.9, 1.28)
        : defaultSongRenderPreferences.lyricsFontScale,
    lineHeight:
      typeof candidate.lineHeight === "number"
        ? clamp(candidate.lineHeight, 0.96, 1.5)
        : defaultSongRenderPreferences.lineHeight,
    sourcePriority: normalizeSourcePriority(candidate.sourcePriority),
  };
}

export function readSongRenderPreferences(
  storageValue: string | null,
): SongRenderPreferences {
  if (!storageValue) {
    return defaultSongRenderPreferences;
  }

  try {
    return normalizeSongRenderPreferences(JSON.parse(storageValue));
  } catch {
    return defaultSongRenderPreferences;
  }
}

export function resolvePreferredSongSource(
  sourcePriority: SongSourceView[],
  availableSources: SongSourceView[],
): SongSourceView {
  return (
    sourcePriority.find((source) => availableSources.includes(source)) ??
    availableSources[0] ??
    "lyrics"
  );
}

export function reorderSongSourcePriority(
  sourcePriority: SongSourceView[],
  source: SongSourceView,
  target: SongSourceView,
  placement: SongSourcePriorityPlacement = "before",
): SongSourceView[] {
  if (source === target) {
    return sourcePriority;
  }

  const nextPriority = sourcePriority.filter((item) => item !== source);
  const targetIndex = nextPriority.indexOf(target);

  if (targetIndex === -1) {
    return sourcePriority;
  }

  nextPriority.splice(targetIndex + (placement === "after" ? 1 : 0), 0, source);

  return nextPriority;
}

export function shiftSongSourcePriority(
  sourcePriority: SongSourceView[],
  source: SongSourceView,
  offset: number,
): SongSourceView[] {
  const sourceIndex = sourcePriority.indexOf(source);

  if (sourceIndex === -1) {
    return sourcePriority;
  }

  const targetIndex = clamp(
    sourceIndex + offset,
    0,
    sourcePriority.length - 1,
  );

  if (targetIndex === sourceIndex) {
    return sourcePriority;
  }

  const nextPriority = [...sourcePriority];
  const [movedSource] = nextPriority.splice(sourceIndex, 1);

  nextPriority.splice(targetIndex, 0, movedSource);

  return nextPriority;
}
