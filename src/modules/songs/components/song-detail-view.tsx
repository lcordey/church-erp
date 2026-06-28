"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  TransposableSongSheet,
  type TransposableSongSheetHandle,
} from "./transposable-song-sheet";

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

function MaximizeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 4H4v4" />
      <path d="M16 4h4v4" />
      <path d="M20 16v4h-4" />
      <path d="M4 16v4h4" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 4H4v5" />
      <path d="M15 4h5v5" />
      <path d="M20 15v5h-5" />
      <path d="M4 15v5h5" />
      <path d="m9 9-5-5" />
      <path d="m15 9 5-5" />
      <path d="m15 15 5 5" />
      <path d="m9 15-5 5" />
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
  const hasChords = hasChordProChords(song.chordProContent);
  const [sourceView, setSourceView] = useState<
    "chordpro" | "lyrics" | "pdf" | "musicxml"
  >("lyrics");
  const collectionLabel = formatSongCollectionLabel(
    song.collection,
    song.collectionNumber,
  );
  const musicXmlViewerRef = useRef<MusicXmlScoreViewerHandle>(null);
  const textViewerRef = useRef<TransposableSongSheetHandle>(null);
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  const [areSettingsVisible, setAreSettingsVisible] = useState(true);

  function getDownloadHref(sourceUrl: string) {
    const separator = sourceUrl.includes("?") ? "&" : "?";
    return `${sourceUrl}${separator}download=1`;
  }

  useEffect(() => {
    if (!isViewerFullscreen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsViewerFullscreen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isViewerFullscreen]);

  const hasDisplaySettings =
    sourceView === "chordpro" || sourceView === "musicxml";

  async function downloadActiveDocument() {
    if (sourceView === "pdf" && song.pdfSource) {
      const link = document.createElement("a");
      link.href = getDownloadHref(song.pdfSource.downloadUrl);
      link.click();
      return;
    }

    if (sourceView === "musicxml") {
      await musicXmlViewerRef.current?.downloadPdf();
      return;
    }

    await textViewerRef.current?.downloadPdf();
  }

  return (
    <section className="song-detail-view">
      <section
        className={`song-document-viewer song-document-viewer--${sourceView} ${
          isViewerFullscreen ? "song-document-viewer--fullscreen" : ""
        }`}
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
              value={sourceView}
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
              aria-label={
                isViewerFullscreen
                  ? "Quitter le plein écran"
                  : "Passer en plein écran"
              }
              className="icon-button song-document-viewer__icon-button"
              onClick={() => setIsViewerFullscreen((current) => !current)}
              title={isViewerFullscreen ? "Quitter le plein écran" : "Plein écran"}
              type="button"
            >
              {isViewerFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
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
        </header>

        {canAccessScores && sourceView === "pdf" && song.pdfSource ? (
          <SongPdfViewer
            copyright={song.copyright}
            sourceUrl={song.pdfSource.downloadUrl}
            title={song.title}
          />
        ) : canAccessScores &&
          sourceView === "musicxml" &&
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
              sourceView === "lyrics" || !hasChords ? "lyrics" : "chords"
            }
            showSettings={areSettingsVisible}
            title={song.title}
          />
        )}
      </section>

      <div className="song-detail-view__meta-footer">
        <div className="song-header__metadata song-header__metadata--footer">
          {collectionLabel ? <span>{collectionLabel}</span> : null}
          <span>{song.author ?? "Auteur non renseigné"}</span>
          {song.defaultKey ? (
            <span>
              Tonalité <MusicalKeyText musicalKey={song.defaultKey} />
            </span>
          ) : null}
          {song.sourcePageUrl ? (
            <a
              className="song-source-button"
              href={song.sourcePageUrl}
              rel="noreferrer"
              target="_blank"
            >
              Source JEMAF
            </a>
          ) : null}
          {"isEditable" in song && !song.isEditable ? (
            <span>Source officielle</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
