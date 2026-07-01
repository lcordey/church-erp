"use client";

import {
  type DragEvent,
  type PointerEvent,
  useState,
} from "react";

import {
  chordColorOptions,
  defaultSongRenderPreferences,
  reorderSongSourcePriority,
  shiftSongSourcePriority,
  type SongSourcePriorityPlacement,
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

const sourceDescriptions: Record<SongSourceView, string> = {
  chordpro: "Paroles avec accords intégrés.",
  lyrics: "Texte seul, sans notation.",
  musicxml: "Partition générée depuis MusicXML.",
  pdf: "Document importé tel quel.",
};

type SongRenderPreferencesControlsProps = {
  showDescription?: boolean;
  showSourcePriority?: boolean;
};

type DropIndicator = {
  placement: SongSourcePriorityPlacement;
  target: SongSourceView;
};

export function SongRenderPreferencesControls({
  showDescription = false,
  showSourcePriority = true,
}: SongRenderPreferencesControlsProps) {
  const { preferences, resetPreferences, setPreferences } =
    useSongRenderPreferences();
  const [draggedSource, setDraggedSource] = useState<SongSourceView | null>(
    null,
  );
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(
    null,
  );

  function commitSourcePriority(nextPriority: SongSourceView[]) {
    setPreferences({ sourcePriority: nextPriority });
  }

  function clearDragState() {
    setDraggedSource(null);
    setDropIndicator(null);
  }

  function resolveDropIndicator(
    source: SongSourceView,
    clientY: number,
    element: HTMLElement,
  ): DropIndicator {
    const bounds = element.getBoundingClientRect();

    return {
      placement: clientY < bounds.top + bounds.height / 2 ? "before" : "after",
      target: source,
    };
  }

  function findDropIndicator(clientX: number, clientY: number) {
    const hoveredElement = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-song-source-priority]");

    if (!hoveredElement) {
      return null;
    }

    const hoveredSource = hoveredElement.dataset
      .songSourcePriority as SongSourceView | undefined;

    if (!hoveredSource) {
      return null;
    }

    return resolveDropIndicator(hoveredSource, clientY, hoveredElement);
  }

  function applyDrop(nextDropIndicator: DropIndicator | null) {
    if (!draggedSource || !nextDropIndicator) {
      clearDragState();
      return;
    }

    commitSourcePriority(
      reorderSongSourcePriority(
        preferences.sourcePriority,
        draggedSource,
        nextDropIndicator.target,
        nextDropIndicator.placement,
      ),
    );
    clearDragState();
  }

  function handleDragStart(
    source: SongSourceView,
    event: DragEvent<HTMLElement>,
  ) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    ) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", source);
    setDraggedSource(source);
    setDropIndicator(null);
  }

  function handleDragOver(
    source: SongSourceView,
    event: DragEvent<HTMLElement>,
  ) {
    if (!draggedSource) {
      return;
    }

    event.preventDefault();
    setDropIndicator(
      resolveDropIndicator(source, event.clientY, event.currentTarget),
    );
  }

  function handleDrop(source: SongSourceView, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    applyDrop(resolveDropIndicator(source, event.clientY, event.currentTarget));
  }

  function handlePointerDown(
    source: SongSourceView,
    event: PointerEvent<HTMLElement>,
  ) {
    if (event.pointerType === "mouse") {
      return;
    }

    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedSource(source);
    setDropIndicator(null);
  }

  function handlePointerMove(
    source: SongSourceView,
    event: PointerEvent<HTMLElement>,
  ) {
    if (event.pointerType === "mouse" || draggedSource !== source) {
      return;
    }

    event.preventDefault();
    setDropIndicator(findDropIndicator(event.clientX, event.clientY));
  }

  function handlePointerUp(
    source: SongSourceView,
    event: PointerEvent<HTMLElement>,
  ) {
    if (event.pointerType === "mouse" || draggedSource !== source) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    applyDrop(findDropIndicator(event.clientX, event.clientY) ?? dropIndicator);
  }

  function moveSource(source: SongSourceView, offset: number) {
    commitSourcePriority(
      shiftSongSourcePriority(preferences.sourcePriority, source, offset),
    );
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
        {showSourcePriority ? (
          <div className="song-render-preferences__group">
            <div className="song-render-preferences__group-copy">
              <h4>Source d’ouverture</h4>
              <p>
                Glissez les 4 sources pour définir l’ordre utilisé quand un
                chant s’ouvre. Si une source manque, l’application choisit la
                suivante.
              </p>
            </div>
            <div
              aria-label="Ordre de priorité des sources"
              className="song-render-preferences__priority-list"
              role="list"
            >
              {preferences.sourcePriority.map((source, index) => (
                <div
                  className={[
                    "song-render-preferences__priority-item",
                    draggedSource === source
                      ? "song-render-preferences__priority-item--dragging"
                      : "",
                    dropIndicator?.target === source &&
                    dropIndicator.placement === "before"
                      ? "song-render-preferences__priority-item--drop-before"
                      : "",
                    dropIndicator?.target === source &&
                    dropIndicator.placement === "after"
                      ? "song-render-preferences__priority-item--drop-after"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-song-source-priority={source}
                  draggable
                  key={source}
                  onDragEnd={clearDragState}
                  onDragStart={(event) => handleDragStart(source, event)}
                  onDragOver={(event) => handleDragOver(source, event)}
                  onDrop={(event) => handleDrop(source, event)}
                  onPointerCancel={clearDragState}
                  onPointerDown={(event) => handlePointerDown(source, event)}
                  onPointerMove={(event) => handlePointerMove(source, event)}
                  onPointerUp={(event) => handlePointerUp(source, event)}
                  role="listitem"
                >
                  <div className="song-render-preferences__priority-main">
                    <span className="song-render-preferences__priority-rank">
                      {index + 1}
                    </span>
                    <div className="song-render-preferences__priority-copy">
                      <strong>{sourceLabels[source]}</strong>
                      <p>{sourceDescriptions[source]}</p>
                    </div>
                  </div>

                  <div className="song-render-preferences__priority-actions">
                    <button
                      aria-label={`Monter ${sourceLabels[source]}`}
                      className="song-render-preferences__priority-button"
                      disabled={index === 0}
                      onClick={() => moveSource(source, -1)}
                      type="button"
                    >
                      Monter
                    </button>
                    <button
                      aria-label={`Descendre ${sourceLabels[source]}`}
                      className="song-render-preferences__priority-button"
                      disabled={
                        index === preferences.sourcePriority.length - 1
                      }
                      onClick={() => moveSource(source, 1)}
                      type="button"
                    >
                      Descendre
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="song-render-preferences__priority-help">
              Astuce: fais glisser la carte directement. Sur mobile, maintiens
              la carte puis déplace-la. Les boutons Monter et Descendre restent
              disponibles.
            </p>
          </div>
        ) : null}

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
