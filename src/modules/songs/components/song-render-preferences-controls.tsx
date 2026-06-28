"use client";

import {
  chordColorOptions,
  defaultSongRenderPreferences,
} from "./song-render-preferences";
import { useSongRenderPreferences } from "./song-render-preferences-provider";

const chordColorLabels: Record<(typeof chordColorOptions)[number], string> = {
  accent: "Bleu",
  ink: "Noir",
  warm: "Ocre",
};

type SongRenderPreferencesControlsProps = {
  showDescription?: boolean;
};

export function SongRenderPreferencesControls({
  showDescription = false,
}: SongRenderPreferencesControlsProps) {
  const { preferences, resetPreferences, setPreferences } =
    useSongRenderPreferences();

  return (
    <div className="song-render-preferences">
      {showDescription ? (
        <div className="song-render-preferences__intro">
          <div>
            <h3>Rendu par défaut</h3>
            <p>
              Ces préférences sont mémorisées sur cet appareil et réutilisées
              dans toutes les vues paroles et accords.
            </p>
          </div>
          <button
            className="admin-button admin-button--quiet"
            onClick={resetPreferences}
            type="button"
          >
            Réinitialiser
          </button>
        </div>
      ) : null}

      <div className="song-render-preferences__section">
        <label className="sheet-controls__field">
          <span>Couleur des accords</span>
          <select
            aria-label="Couleur des accords"
            onChange={(event) =>
              setPreferences({
                chordColor: event.target.value as
                  | "warm"
                  | "accent"
                  | "ink",
              })
            }
            value={preferences.chordColor}
          >
            {chordColorOptions.map((option) => (
              <option key={option} value={option}>
                {chordColorLabels[option]}
              </option>
            ))}
          </select>
          <strong>{chordColorLabels[preferences.chordColor]}</strong>
        </label>

        <label className="sheet-controls__field">
          <span>Taille des accords</span>
          <input
            aria-label="Taille des accords"
            max="1.24"
            min="0.68"
            onChange={(event) =>
              setPreferences({
                chordFontScale: Number.parseFloat(event.target.value),
              })
            }
            step="0.02"
            type="range"
            value={preferences.chordFontScale}
          />
          <strong>
            {Math.round(
              (preferences.chordFontScale /
                defaultSongRenderPreferences.chordFontScale) *
                100,
            )}
            %
          </strong>
        </label>

        <label className="sheet-controls__field">
          <span>Taille du texte</span>
          <input
            aria-label="Taille du texte"
            max="1.28"
            min="0.9"
            onChange={(event) =>
              setPreferences({
                lyricsFontScale: Number.parseFloat(event.target.value),
              })
            }
            step="0.02"
            type="range"
            value={preferences.lyricsFontScale}
          />
          <strong>
            {Math.round(
              (preferences.lyricsFontScale /
                defaultSongRenderPreferences.lyricsFontScale) *
                100,
            )}
            %
          </strong>
        </label>

        <label className="sheet-controls__field">
          <span>Interligne</span>
          <input
            aria-label="Interligne des chants"
            max="1.5"
            min="0.96"
            onChange={(event) =>
              setPreferences({
                lineHeight: Number.parseFloat(event.target.value),
              })
            }
            step="0.02"
            type="range"
            value={preferences.lineHeight}
          />
          <strong>{preferences.lineHeight.toFixed(2)}</strong>
        </label>
      </div>
    </div>
  );
}
