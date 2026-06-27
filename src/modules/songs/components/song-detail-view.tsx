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
  eyebrow = "Chant publié",
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

  const documentLabel =
    sourceView === "lyrics"
      ? "Paroles"
      : sourceView === "chordpro"
        ? "Paroles et accords"
        : sourceView === "pdf"
          ? "Partition PDF"
          : "Partition";
  const documentDetail =
    sourceView === "pdf" && song.pdfSource
      ? (song.pdfSource.fileName ?? song.title)
      : sourceView === "musicxml" && song.musicXmlSource
        ? (song.musicXmlSource.fileName ?? song.title)
        : song.title;

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

  function openActiveDocument() {
    if (sourceView === "pdf" && song.pdfSource) {
      const popup = window.open(song.pdfSource.downloadUrl, "_blank");

      if (popup) {
        popup.opener = null;
      }

      return;
    }

    if (sourceView === "musicxml") {
      musicXmlViewerRef.current?.openDocument();
      return;
    }

    textViewerRef.current?.openDocument();
  }

  return (
    <section className="song-detail-view">
      <header className="song-header song-header--compact">
        <div className="song-header__top-row">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{song.title}</h1>
          </div>
        </div>

        <div className="song-source-toggle" aria-label="Source du chant">
          <button
            aria-pressed={sourceView === "lyrics"}
            onClick={() => setSourceView("lyrics")}
            type="button"
          >
            Paroles
          </button>
          {hasChords ? (
            <button
              aria-pressed={sourceView === "chordpro"}
              onClick={() => setSourceView("chordpro")}
              type="button"
            >
              Accords
            </button>
          ) : null}
          {canAccessScores && song.pdfSource ? (
            <button
              aria-pressed={sourceView === "pdf"}
              onClick={() => setSourceView("pdf")}
              type="button"
            >
              PDF
            </button>
          ) : null}
          {canAccessScores && song.musicXmlSource ? (
            <button
              aria-pressed={sourceView === "musicxml"}
              onClick={() => setSourceView("musicxml")}
              type="button"
            >
              Partition
            </button>
          ) : null}
        </div>

        {actions ? <div className="song-detail-view__actions">{actions}</div> : null}
      </header>

      <section
        className={`song-document-viewer song-document-viewer--${sourceView} ${
          isViewerFullscreen ? "song-document-viewer--fullscreen" : ""
        }`}
      >
        <header className="song-document-viewer__toolbar">
          <div>
            <span>{documentLabel}</span>
            <small>{documentDetail}</small>
          </div>
          <div className="song-document-viewer__actions">
            <button
              className="admin-button"
              onClick={() => setIsViewerFullscreen((current) => !current)}
              type="button"
            >
              {isViewerFullscreen ? "Quitter" : "Plein écran"}
            </button>
            <button
              className="admin-button"
              onClick={() => void downloadActiveDocument()}
              type="button"
            >
              Télécharger
            </button>
            <button
              className="admin-button admin-button--primary"
              onClick={openActiveDocument}
              type="button"
            >
              Ouvrir
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
