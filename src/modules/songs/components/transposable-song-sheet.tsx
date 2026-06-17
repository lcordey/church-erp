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
import { useMusicNotation } from "./music-notation-provider";

type TransposableSongSheetProps = {
  content: string;
  defaultKey: string | null;
};

export function TransposableSongSheet({
  content,
  defaultKey,
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
            aria-label="Monter d’un demi-ton"
            onClick={() => shift(1)}
            type="button"
          >
            +
          </button>
          {(transposeBy !== 0 || manualOffset !== 0) && (
            <button
              className="transpose-toolbar__reset"
              onClick={() => {
                setSelectedKey(canonicalDefaultKey ?? "");
                setManualOffset(0);
              }}
              type="button"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="sheet-card">
        <div className="sheet-card__edge" aria-hidden="true" />
        <ChordSheet content={content} transposeBy={transposeBy} />
      </div>
    </section>
  );
}
