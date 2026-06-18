"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SongDetailView } from "@/src/modules/songs/components/song-detail-view";

import type { SetlistDetail } from "../types/setlist";

type SetlistPlayerProps = {
  setlist: SetlistDetail;
};

export function SetlistPlayer({ setlist }: SetlistPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const currentItem = setlist.items[currentIndex];

  function goTo(index: number) {
    setCurrentIndex(Math.min(Math.max(index, 0), setlist.items.length - 1));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        setCurrentIndex((index) => Math.max(index - 1, 0));
      }

      if (event.key === "ArrowRight") {
        setCurrentIndex((index) => Math.min(index + 1, setlist.items.length - 1));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setlist.items.length]);

  if (!currentItem) {
    return (
      <main className="song-page">
        <div className="song-page__shell">
          <header className="app-top-bar">
            <div className="app-top-bar__identity">
              <Link className="app-top-bar__back" href={`/setlist/${setlist.id}`}>
                <span aria-hidden="true">←</span>
                Retour à la setlist
              </Link>
            </div>
          </header>
          <div className="empty-state">
            <p>Cette setlist ne contient pas encore de chant.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="song-page setlist-player"
      onTouchEnd={(event) => {
        if (touchStart === null) {
          return;
        }

        const delta = event.changedTouches[0].clientX - touchStart;

        if (Math.abs(delta) > 52) {
          goTo(delta > 0 ? currentIndex - 1 : currentIndex + 1);
        }

        setTouchStart(null);
      }}
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
    >
      <div className="song-page__shell">
        <header className="app-top-bar">
          <div className="app-top-bar__identity">
            <Link className="app-top-bar__back" href={`/setlist/${setlist.id}`}>
              <span aria-hidden="true">←</span>
              {setlist.title}
            </Link>
          </div>
          <div className="app-top-bar__actions">
            <span className="setlist-player__count">
              {currentIndex + 1} / {setlist.items.length}
            </span>
            <button
              className="admin-button"
              disabled={currentIndex === 0}
              onClick={() => goTo(currentIndex - 1)}
              type="button"
            >
              Précédent
            </button>
            <button
              className="admin-button admin-button--primary"
              disabled={currentIndex === setlist.items.length - 1}
              onClick={() => goTo(currentIndex + 1)}
              type="button"
            >
              Suivant
            </button>
          </div>
        </header>
        <SongDetailView
          eyebrow={`${setlist.title} · ${currentIndex + 1}/${setlist.items.length}`}
          song={currentItem.song}
        />
      </div>
    </main>
  );
}
