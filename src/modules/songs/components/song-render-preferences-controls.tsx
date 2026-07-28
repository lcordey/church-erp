"use client";

import {
  type DragEvent,
  type PointerEvent,
  useState,
} from "react";

import { ReorderItemActions } from "@/src/components/reorder-item-actions";

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
  claret: "Bordeaux",
  ink: "Noir",
  plum: "Prune",
  sage: "Sauge",
  warm: "Ocre",
};

const sourceLabels: Record<SongSourceView, string> = {
  chordpro: "Accords",
  lyrics: "Paroles",
  musicxml: "Partition",
  pdf: "PDF",
};

type SongRenderPreferencesControlsProps = {
  showSourcePriority?: boolean;
};

type DropIndicator = {
  placement: SongSourcePriorityPlacement;
  target: SongSourceView;
};

export function SongRenderPreferencesResetButton() {
  const { resetPreferences } = useSongRenderPreferences();

  return (
    <button
      aria-label="Réinitialiser les préférences de lecture"
      className="settings-section__reset-button"
      onClick={resetPreferences}
      title="Réinitialiser"
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20 11a8 8 0 1 1-2.35-5.65" />
        <path d="M20 4v7h-7" />
      </svg>
      <span className="sr-only">Réinitialiser</span>
    </button>
  );
}

export function SongRenderPreferencesControls({
  showSourcePriority = true,
}: SongRenderPreferencesControlsProps) {
  const { preferences, setPreferences } =
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
      <div
        className={`song-render-preferences__section${showSourcePriority ? "" : " song-render-preferences__section--compact"}`}
      >
        {showSourcePriority ? (
          <div className="song-render-preferences__group">
            <div
              aria-label="Ordre de priorité des sources"
              className="reorderable-list song-render-preferences__priority-list"
              role="list"
            >
              {preferences.sourcePriority.map((source, index) => (
                <div
                  className={[
                    "reorderable-item",
                    "song-render-preferences__priority-item",
                    draggedSource === source
                      ? "reorderable-item--dragging"
                      : "",
                    dropIndicator?.target === source &&
                    dropIndicator.placement === "before"
                      ? "reorderable-item--drop-before"
                      : "",
                    dropIndicator?.target === source &&
                    dropIndicator.placement === "after"
                      ? "reorderable-item--drop-after"
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
                    </div>
                    <ReorderItemActions
                      downLabel={`Descendre ${sourceLabels[source]}`}
                      isDownDisabled={index === preferences.sourcePriority.length - 1}
                      isUpDisabled={index === 0}
                      onMoveDown={() => moveSource(source, 1)}
                      onMoveUp={() => moveSource(source, -1)}
                      upLabel={`Monter ${sourceLabels[source]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <label className="sheet-controls__field sheet-controls__field--color">
          <span>Couleur des accords</span>
          <select
            aria-label="Couleur des accords"
            onChange={(event) =>
              setPreferences({
                chordColor: event.target.value as (typeof chordColorOptions)[number],
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
