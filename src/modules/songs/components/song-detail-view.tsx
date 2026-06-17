"use client";

import type { ReactNode } from "react";

import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail } from "../types/public-song";
import { MusicalKeyText } from "./musical-key-text";
import { TransposableSongSheet } from "./transposable-song-sheet";

type SongDetailViewProps = {
  song: PublicSongDetail | AdminSong;
  actions?: ReactNode;
  eyebrow?: string;
};

export function SongDetailView({
  song,
  actions,
  eyebrow = "Chant publié",
}: SongDetailViewProps) {
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
          {song.collection ? (
            <span>
              {song.collection}
              {song.collectionNumber
                ? ` ${String(song.collectionNumber).padStart(3, "0")}`
                : ""}
            </span>
          ) : null}
          <span>{song.author ?? "Auteur non renseigné"}</span>
          {song.defaultKey ? (
            <span>
              Tonalité <MusicalKeyText musicalKey={song.defaultKey} />
            </span>
          ) : null}
          {song.copyright ? <span>{song.copyright}</span> : null}
          {song.sourcePageUrl ? (
            <a href={song.sourcePageUrl} rel="noreferrer" target="_blank">
              Source JEMAF
            </a>
          ) : null}
          {"isEditable" in song && !song.isEditable ? (
            <span>Source officielle</span>
          ) : null}
        </div>

        {actions ? <div className="song-detail-view__actions">{actions}</div> : null}
      </header>

      <TransposableSongSheet
        content={song.chordProContent}
        defaultKey={song.defaultKey}
      />
    </section>
  );
}
