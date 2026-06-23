"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { formatSongCollectionLabel } from "../collections/song-collection";
import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail } from "../types/public-song";
import { MusicalKeyText } from "./musical-key-text";
import { MusicXmlScoreViewer } from "./music-xml-score-viewer";
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
  const [sourceView, setSourceView] = useState<
    "chordpro" | "pdf" | "musicxml"
  >("chordpro");
  const collectionLabel = formatSongCollectionLabel(
    song.collection,
    song.collectionNumber,
  );

  return (
    <section className="song-detail-view">
      <header className="song-header song-header--compact">
        <div className="song-header__top-row">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{song.title}</h1>
          </div>
        </div>

        <div className="song-header__metadata">
          {collectionLabel ? <span>{collectionLabel}</span> : null}
          <span>{song.author ?? "Auteur non renseigné"}</span>
          {song.defaultKey ? (
            <span>
              Tonalité <MusicalKeyText musicalKey={song.defaultKey} />
            </span>
          ) : null}
          {song.copyright ? <span>{song.copyright}</span> : null}
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

        <div className="song-source-toggle" aria-label="Source du chant">
          <button
            aria-pressed={sourceView === "chordpro"}
            onClick={() => setSourceView("chordpro")}
            type="button"
          >
            Accords
          </button>
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
        <section className="song-pdf-viewer">
          <header className="song-pdf-viewer__toolbar">
            <div>
              <span>Partition PDF</span>
              <small>{song.pdfSource.fileName ?? song.title}</small>
            </div>
            <a
              className="admin-button admin-button--primary"
              href={song.pdfSource.downloadUrl}
              target="_blank"
            >
              Ouvrir
            </a>
          </header>
          <div className="song-pdf-viewer__stage">
            <iframe
              aria-label="Partition PDF"
              src={`${song.pdfSource.downloadUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              title={`Partition PDF de ${song.title}`}
            />
          </div>
        </section>
      ) : canAccessScores && sourceView === "musicxml" && song.musicXmlSource ? (
        <section className="song-score-viewer">
          <header className="song-pdf-viewer__toolbar">
            <div>
              <span>Partition</span>
              <small>{song.musicXmlSource.fileName ?? song.title}</small>
            </div>
            <a
              className="admin-button admin-button--primary"
              href={song.musicXmlSource.downloadUrl}
              target="_blank"
            >
              Ouvrir
            </a>
          </header>
          <MusicXmlScoreViewer
            key={song.id}
            copyright={song.copyright}
            defaultKey={song.defaultKey}
            sourceUrl={song.musicXmlSource.downloadUrl}
            title={song.title}
          />
        </section>
      ) : (
        <TransposableSongSheet
          content={song.chordProContent}
          defaultKey={song.defaultKey}
        />
      )}
    </section>
  );
}
