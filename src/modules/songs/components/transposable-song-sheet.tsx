"use client";

import { useState } from "react";

import {
  formatMusicalKey,
  getKeysForMode,
  getKeyTransposition,
  isMusicalKey,
  transposeChord,
} from "../music/musical-key";
import { ChordSheet } from "./chord-sheet";
import { LyricsSheet } from "./lyrics-sheet";
import { useMusicNotation } from "./music-notation-provider";

type TransposableSongSheetProps = {
  content: string;
  copyright: string | null;
  defaultKey: string | null;
  displayMode?: "chords" | "lyrics";
  title: string;
};

export function TransposableSongSheet({
  content,
  copyright,
  defaultKey,
  displayMode = "chords",
  title,
}: TransposableSongSheetProps) {
  const { notation } = useMusicNotation();
  const canonicalDefaultKey =
    defaultKey && isMusicalKey(defaultKey) ? defaultKey : null;
  const [selectedKey, setSelectedKey] = useState(canonicalDefaultKey ?? "");
  const [manualOffset, setManualOffset] = useState(0);
  const transposeBy = canonicalDefaultKey
    ? getKeyTransposition(canonicalDefaultKey, selectedKey)
    : manualOffset;
  const displayedKey = canonicalDefaultKey
    ? selectedKey
    : defaultKey
      ? transposeChord(defaultKey, manualOffset)
      : null;
  const isResetDisabled = transposeBy === 0 && manualOffset === 0;
  const [lineHeight, setLineHeight] = useState(1.18);

  function shift(step: number) {
    if (!canonicalDefaultKey) {
      setManualOffset((current) => current + step);
      return;
    }

    const options = getKeysForMode(canonicalDefaultKey);
    const currentIndex = options.indexOf(selectedKey as (typeof options)[number]);
    const nextIndex = (currentIndex + step + options.length) % options.length;
    setSelectedKey(options[nextIndex]);
  }

  return (
    <section>
      {displayMode === "chords" ? (
        <>
          <div className="transpose-toolbar">
            <div>
              <span>Transposition temporaire</span>
              <small>La tonalité enregistrée reste inchangée.</small>
            </div>
            <div className="transpose-toolbar__controls">
              <button
                aria-label="Descendre d’un demi-ton"
                onClick={() => shift(-1)}
                type="button"
              >
                −
              </button>
              {canonicalDefaultKey ? (
                <select
                  aria-label="Tonalité affichée"
                  value={selectedKey}
                  onChange={(event) => setSelectedKey(event.target.value)}
                >
                  {getKeysForMode(canonicalDefaultKey).map((key) => (
                    <option key={key} value={key}>
                      {formatMusicalKey(key, notation)}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>
                  {displayedKey
                    ? formatMusicalKey(displayedKey, notation)
                    : `${manualOffset >= 0 ? "+" : ""}${manualOffset}`}
                </strong>
              )}
              <button
                className="transpose-toolbar__reset"
                aria-label="Réinitialiser la transposition"
                disabled={isResetDisabled}
                onClick={() => {
                  setSelectedKey(canonicalDefaultKey ?? "");
                  setManualOffset(0);
                }}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M19 8a7 7 0 1 0 1.4 7.2" />
                  <path d="M19 4v5h-5" />
                </svg>
              </button>
              <button
                aria-label="Monter d’un demi-ton"
                onClick={() => shift(1)}
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <div className="sheet-controls">
            <label className="sheet-controls__field">
              <span>Interligne</span>
              <input
                aria-label="Interligne du rendu accords"
                max="1.4"
                min="0.92"
                onChange={(event) =>
                  setLineHeight(Number.parseFloat(event.target.value))
                }
                step="0.02"
                type="range"
                value={lineHeight}
              />
              <strong>{lineHeight.toFixed(2)}</strong>
            </label>
          </div>
        </>
      ) : null}

      <div
        className={`sheet-card ${displayMode === "lyrics" ? "sheet-card--lyrics" : ""}`}
      >
        <div className="sheet-card__edge" aria-hidden="true" />
        <header className="sheet-card__header">
          <h2 className="sheet-card__title">{title}</h2>
          {displayMode === "chords" && displayedKey ? (
            <p className="sheet-card__subtitle">
              Tonalité{" "}
              <strong>{formatMusicalKey(displayedKey, notation)}</strong>
            </p>
          ) : null}
        </header>
        {displayMode === "chords" ? (
          <ChordSheet
            content={content}
            lineHeight={lineHeight}
            transposeBy={transposeBy}
          />
        ) : (
          <LyricsSheet content={content} />
        )}
        {copyright ? (
          <footer className="sheet-card__footer">{copyright}</footer>
        ) : null}
      </div>
    </section>
  );
}
