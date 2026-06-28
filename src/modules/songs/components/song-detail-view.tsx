"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatSongCollectionLabel } from "../collections/song-collection";
import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail } from "../types/public-song";
import { MusicalKeyText } from "./musical-key-text";
import {
  MusicXmlScoreViewer,
  type MusicXmlScoreViewerHandle,
} from "./music-xml-score-viewer";
import { hasChordProChords } from "../services/chordpro";
import { SongPdfViewer } from "./song-pdf-viewer";
import {
  resolvePreferredSongSource,
  type SongSourceView,
} from "./song-render-preferences";
import {
  TransposableSongSheet,
  type TransposableSongSheetHandle,
} from "./transposable-song-sheet";
import { useSongRenderPreferences } from "./song-render-preferences-provider";

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 4H4v4" />
      <path d="M16 4h4v4" />
      <path d="M20 16v4h-4" />
      <path d="M4 16v4h4" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 4H4v5" />
      <path d="m4 4 6 6" />
      <path d="M15 4h5v5" />
      <path d="m20 4-6 6" />
      <path d="M4 15v5h5" />
      <path d="m4 20 6-6" />
      <path d="M20 15v5h-5" />
      <path d="m20 20-6-6" />
    </svg>
  );
}

type SongDetailViewProps = {
  song: PublicSongDetail | AdminSong;
  actions?: ReactNode;
  canAccessScores?: boolean;
  eyebrow?: string;
};

export function SongDetailView({
  song,
  actions,
  canAccessScores = false,
}: SongDetailViewProps) {
  const containerRef = useRef<HTMLElement>(null);
  const { preferences } = useSongRenderPreferences();
  const hasChords = hasChordProChords(song.chordProContent);
  const availableSources = useMemo(
    () =>
      [
        "lyrics",
        ...(hasChords ? (["chordpro"] as const) : []),
        ...(canAccessScores && song.pdfSource ? (["pdf"] as const) : []),
        ...(canAccessScores && song.musicXmlSource
          ? (["musicxml"] as const)
          : []),
      ] satisfies SongSourceView[],
    [canAccessScores, hasChords, song.musicXmlSource, song.pdfSource],
  );
  const [sourceView, setSourceView] = useState<SongSourceView>(() =>
    resolvePreferredSongSource(preferences.sourcePriority, availableSources),
  );
  const resolvedSourceView = useMemo(
    () =>
      availableSources.includes(sourceView)
        ? sourceView
        : resolvePreferredSongSource(preferences.sourcePriority, availableSources),
    [availableSources, preferences.sourcePriority, sourceView],
  );
  const collectionLabel = formatSongCollectionLabel(
    song.collection,
    song.collectionNumber,
  );
  const musicXmlViewerRef = useRef<MusicXmlScoreViewerHandle>(null);
  const textViewerRef = useRef<TransposableSongSheetHandle>(null);
  const [areSettingsVisible, setAreSettingsVisible] = useState(false);
  const [areDetailsVisible, setAreDetailsVisible] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFocusExitVisible, setIsFocusExitVisible] = useState(false);

  useEffect(() => {
    function handleFullscreenChange() {
      const isActive = document.fullscreenElement === containerRef.current;
      setIsFocusMode(isActive);
      setIsFocusExitVisible(isActive);

      if (!isActive) {
        setAreDetailsVisible(false);
        setAreSettingsVisible(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isFocusMode || !isFocusExitVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsFocusExitVisible(false);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [isFocusExitVisible, isFocusMode]);

  function getDownloadHref(sourceUrl: string) {
    const separator = sourceUrl.includes("?") ? "&" : "?";
    return `${sourceUrl}${separator}download=1`;
  }

  const hasDisplaySettings =
    resolvedSourceView === "chordpro" || resolvedSourceView === "musicxml";

  async function downloadActiveDocument() {
    if (resolvedSourceView === "pdf" && song.pdfSource) {
      const link = document.createElement("a");
      link.href = getDownloadHref(song.pdfSource.downloadUrl);
      link.click();
      return;
    }

    if (resolvedSourceView === "musicxml") {
      await musicXmlViewerRef.current?.downloadPdf();
      return;
    }

    await textViewerRef.current?.downloadPdf();
  }

  async function enterFocusMode() {
    if (!containerRef.current?.requestFullscreen) {
      return;
    }

    setAreDetailsVisible(false);
    setAreSettingsVisible(false);
    await containerRef.current.requestFullscreen();
  }

  async function exitFocusMode() {
    if (!document.fullscreenElement) {
      return;
    }

    await document.exitFullscreen();
  }

  function handleFocusPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!isFocusMode) {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("button, a, select, input, label")) {
      return;
    }

    setIsFocusExitVisible(true);
  }

  return (
    <section
      className={`song-detail-view${isFocusMode ? " song-detail-view--focus" : ""}`}
      onPointerDown={handleFocusPointerDown}
      ref={containerRef}
    >
      <section
        className={`song-document-viewer song-document-viewer--${resolvedSourceView}`}
      >
        <header className="song-document-viewer__toolbar">
          <div className="song-document-viewer__source">
            <label className="sr-only" htmlFor={`song-source-${song.id}`}>
              Source du chant
            </label>
            <select
              id={`song-source-${song.id}`}
              onChange={(event) => {
                setSourceView(
                  event.target.value as
                    | "chordpro"
                    | "lyrics"
                    | "pdf"
                    | "musicxml",
                );
              }}
              value={resolvedSourceView}
            >
              <option value="lyrics">Paroles</option>
              {hasChords ? <option value="chordpro">Accords</option> : null}
              {canAccessScores && song.pdfSource ? (
                <option value="pdf">PDF</option>
              ) : null}
              {canAccessScores && song.musicXmlSource ? (
                <option value="musicxml">Partition</option>
              ) : null}
            </select>
            {actions ? (
              <div className="song-detail-view__actions">{actions}</div>
            ) : null}
          </div>
          <div className="song-document-viewer__actions">
            <button
              aria-expanded={areDetailsVisible}
              aria-label={
                areDetailsVisible
                  ? "Masquer les informations du chant"
                  : "Afficher les informations du chant"
              }
              className="icon-button song-document-viewer__icon-button"
              onClick={() => setAreDetailsVisible((current) => !current)}
              title="Informations"
              type="button"
            >
              <InfoIcon />
            </button>
            {hasDisplaySettings ? (
              <button
                aria-pressed={areSettingsVisible}
                aria-label={
                  areSettingsVisible
                    ? "Masquer les réglages d’affichage"
                    : "Afficher les réglages d’affichage"
                }
                className="icon-button song-document-viewer__icon-button"
                onClick={() => setAreSettingsVisible((current) => !current)}
                title={
                  areSettingsVisible
                    ? "Masquer les réglages"
                    : "Afficher les réglages"
                }
                type="button"
              >
                <SettingsIcon />
              </button>
            ) : null}
            <button
              aria-label="Activer le mode focus"
              className="icon-button song-document-viewer__icon-button"
              onClick={() => void enterFocusMode()}
              title="Mode focus"
              type="button"
            >
              <FullscreenIcon />
            </button>
            <button
              aria-label="Télécharger le document"
              className="icon-button song-document-viewer__icon-button"
              onClick={() => void downloadActiveDocument()}
              title="Télécharger"
              type="button"
            >
              <DownloadIcon />
            </button>
          </div>
          {areDetailsVisible ? (
            <aside
              aria-label="Informations du chant"
              className="song-document-viewer__details"
            >
              <strong>{song.title}</strong>
              <dl>
                {collectionLabel ? (
                  <div>
                    <dt>Recueil</dt>
                    <dd>{collectionLabel}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Auteur</dt>
                  <dd>{song.author ?? "Non renseigné"}</dd>
                </div>
                {song.defaultKey ? (
                  <div>
                    <dt>Tonalité</dt>
                    <dd>
                      <MusicalKeyText musicalKey={song.defaultKey} />
                    </dd>
                  </div>
                ) : null}
              </dl>
              {song.sourcePageUrl ? (
                <a
                  href={song.sourcePageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Consulter la source
                </a>
              ) : null}
              {"isEditable" in song && !song.isEditable ? (
                <small>Source officielle</small>
              ) : null}
            </aside>
          ) : null}
        </header>

        {isFocusMode ? (
          <div
            className={`song-document-viewer__focus-exit${
              isFocusExitVisible
                ? " song-document-viewer__focus-exit--visible"
                : ""
            }`}
          >
            <button
              aria-label="Quitter le mode focus"
              className="icon-button song-document-viewer__focus-exit-button"
              onClick={() => void exitFocusMode()}
              type="button"
            >
              <ExitFullscreenIcon />
            </button>
          </div>
        ) : null}

        {canAccessScores && resolvedSourceView === "pdf" && song.pdfSource ? (
          <SongPdfViewer
            copyright={song.copyright}
            sourceUrl={song.pdfSource.downloadUrl}
            title={song.title}
          />
        ) : canAccessScores &&
          resolvedSourceView === "musicxml" &&
          song.musicXmlSource ? (
          <MusicXmlScoreViewer
            ref={musicXmlViewerRef}
            key={song.id}
            collection={song.collection}
            collectionNumber={song.collectionNumber}
            copyright={song.copyright}
            defaultKey={song.defaultKey}
            showSettings={areSettingsVisible}
            sourceUrl={song.musicXmlSource.downloadUrl}
            title={song.title}
          />
        ) : (
          <TransposableSongSheet
            ref={textViewerRef}
            content={song.chordProContent}
            copyright={song.copyright}
            defaultKey={song.defaultKey}
            displayMode={
              resolvedSourceView === "lyrics" || !hasChords
                ? "lyrics"
                : "chords"
            }
            showSettings={areSettingsVisible}
            title={song.title}
          />
        )}
      </section>

    </section>
  );
}
