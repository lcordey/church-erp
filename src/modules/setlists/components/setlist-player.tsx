"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { SongDetailView } from "@/src/modules/songs/components/song-detail-view";

import type { SetlistDetail } from "../types/setlist";

type SetlistPlayerProps = {
  setlist: SetlistDetail;
};

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function SetlistPlayer({ setlist }: SetlistPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const currentItem = setlist.items[currentIndex];

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.min(Math.max(index, 0), setlist.items.length - 1));
    },
    [setlist.items.length],
  );

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

  const headerActions = useMemo(
    () => (
      <>
        <span className="setlist-player__count">
          {currentIndex + 1} / {setlist.items.length}
        </span>
        <button
          aria-label="Chant précédent"
          className="icon-button"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
          type="button"
        >
          <ArrowLeftIcon />
        </button>
        <button
          aria-label="Chant suivant"
          className="icon-button icon-button--primary"
          disabled={currentIndex === setlist.items.length - 1}
          onClick={() => goTo(currentIndex + 1)}
          type="button"
        >
          <ArrowRightIcon />
        </button>
      </>
    ),
    [currentIndex, goTo, setlist.items.length],
  );

  if (!currentItem) {
    return (
      <main className="song-page">
        <div className="song-page__shell">
          <AppTopBar
            backHref={`/setlist/${setlist.id}`}
            backLabel="Retour à la setlist"
            mode="public"
          />
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
        <AppTopBar
          actions={headerActions}
          backHref={`/setlist/${setlist.id}`}
          backLabel={setlist.title}
          mode="public"
        />
        <SongDetailView
          canAccessScores
          eyebrow={`${setlist.title} · ${currentIndex + 1}/${setlist.items.length}`}
          song={currentItem.song}
        />
      </div>
    </main>
  );
}
