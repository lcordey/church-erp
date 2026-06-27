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
import { TransposableSongSheet } from "./transposable-song-sheet";

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

  function getDownloadHref(sourceUrl: string) {
    const separator = sourceUrl.includes("?") ? "&" : "?";
    return `${sourceUrl}${separator}download=1`;
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

      {canAccessScores && sourceView === "pdf" && song.pdfSource ? (
        <section className="song-document-viewer song-document-viewer--pdf">
          <header className="song-document-viewer__toolbar">
            <div>
              <span>Partition PDF</span>
              <small>{song.pdfSource.fileName ?? song.title}</small>
            </div>
            <div className="song-document-viewer__actions">
              <a
                className="admin-button"
                href={getDownloadHref(song.pdfSource.downloadUrl)}
              >
                Télécharger
              </a>
              <a
                className="admin-button admin-button--primary"
                href={song.pdfSource.downloadUrl}
                rel="noreferrer"
                target="_blank"
              >
                Ouvrir
              </a>
            </div>
          </header>
          <SongPdfViewer
            copyright={song.copyright}
            sourceUrl={song.pdfSource.downloadUrl}
            title={song.title}
          />
        </section>
      ) : canAccessScores && sourceView === "musicxml" && song.musicXmlSource ? (
        <section className="song-document-viewer song-document-viewer--score">
          <header className="song-document-viewer__toolbar">
            <div>
              <span>Partition</span>
              <small>{song.musicXmlSource.fileName ?? song.title}</small>
            </div>
            <div className="song-document-viewer__actions">
              <button
                className="admin-button"
                onClick={() => musicXmlViewerRef.current?.openFullscreen()}
                type="button"
              >
                Plein écran
              </button>
              <button
                className="admin-button"
                onClick={async () => {
                  await musicXmlViewerRef.current?.downloadPdf();
                }}
                type="button"
              >
                Télécharger
              </button>
              <button
                className="admin-button admin-button--primary"
                onClick={() => musicXmlViewerRef.current?.openDocument()}
                type="button"
              >
                Ouvrir
              </button>
            </div>
          </header>
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
        </section>
      ) : (
        <TransposableSongSheet
          content={song.chordProContent}
          copyright={song.copyright}
          defaultKey={song.defaultKey}
          displayMode={sourceView === "lyrics" || !hasChords ? "lyrics" : "chords"}
          title={song.title}
        />
      )}

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
