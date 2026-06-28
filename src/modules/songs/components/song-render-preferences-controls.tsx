"use client";

import {
  chordColorOptions,
  defaultSongRenderPreferences,
  songSourceViewOptions,
  type SongSourceView,
} from "./song-render-preferences";
import { useSongRenderPreferences } from "./song-render-preferences-provider";

const chordColorLabels: Record<(typeof chordColorOptions)[number], string> = {
  accent: "Bleu",
  ink: "Noir",
  warm: "Ocre",
};

const sourceLabels: Record<SongSourceView, string> = {
  chordpro: "Accords",
  lyrics: "Paroles",
  musicxml: "Partition",
  pdf: "PDF",
};

type SongRenderPreferencesControlsProps = {
  showDescription?: boolean;
};

export function SongRenderPreferencesControls({
  showDescription = false,
}: SongRenderPreferencesControlsProps) {
  const { preferences, resetPreferences, setPreferences } =
    useSongRenderPreferences();

  function updateSourcePriority(index: number, value: SongSourceView) {
    const nextPriority = preferences.sourcePriority.filter(
      (source) => source !== value,
    );
    nextPriority.splice(index, 0, value);

    setPreferences({
      sourcePriority: [
        ...nextPriority,
        ...songSourceViewOptions.filter(
          (source) => !nextPriority.includes(source),
        ),
      ],
    });
  }

  return (
    <div className="song-render-preferences">
      {showDescription ? (
        <div className="song-render-preferences__intro">
          <div>
            <h3>Rendu par défaut</h3>
            <p>
              Ces préférences sont mémorisées sur cet appareil et réutilisées
              dans toutes les vues de lecture des chants.
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
        <div className="song-render-preferences__group">
          <div className="song-render-preferences__group-copy">
            <h4>Source d’ouverture</h4>
            <p>
              Définissez l’ordre de priorité utilisé quand un chant s’ouvre.
              Si une source manque, l’application choisit la suivante.
            </p>
          </div>
          <div className="song-render-preferences__priority-list">
            {preferences.sourcePriority.map((source, index) => (
              <label className="sheet-controls__field" key={`${source}-${index}`}>
                <span>Priorité {index + 1}</span>
                <select
                  aria-label={`Source prioritaire ${index + 1}`}
                  onChange={(event) =>
                    updateSourcePriority(
                      index,
                      event.target.value as SongSourceView,
                    )
                  }
                  value={source}
                >
                  {songSourceViewOptions.map((option) => (
                    <option key={option} value={option}>
                      {sourceLabels[option]}
                    </option>
                  ))}
                </select>
                <strong>{sourceLabels[source]}</strong>
              </label>
            ))}
          </div>
        </div>

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
