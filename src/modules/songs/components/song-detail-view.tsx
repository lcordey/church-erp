"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";

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
  const [areSettingsVisible, setAreSettingsVisible] = useState(false);
  const [areDetailsVisible, setAreDetailsVisible] = useState(false);

  function getDownloadHref(sourceUrl: string) {
    const separator = sourceUrl.includes("?") ? "&" : "?";
    return `${sourceUrl}${separator}download=1`;
  }

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
        className={`song-document-viewer song-document-viewer--${sourceView}`}
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

    </section>
  );
}
