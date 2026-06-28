export const songRenderPreferenceStorageKey =
  "church-erp-song-render-preferences";

export const songRenderPreferenceChangeEvent =
  "church-erp-song-render-preferences-change";

export const chordColorOptions = ["warm", "accent", "ink"] as const;

export type ChordColorPreference = (typeof chordColorOptions)[number];

export type SongRenderPreferences = {
  chordColor: ChordColorPreference;
  chordFontScale: number;
  lyricsFontScale: number;
  lineHeight: number;
};

export const defaultSongRenderPreferences: SongRenderPreferences = {
  chordColor: "warm",
  chordFontScale: 0.82,
  lyricsFontScale: 1,
  lineHeight: 1.18,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
