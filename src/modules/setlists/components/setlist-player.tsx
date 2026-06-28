"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { SongDetailView } from "@/src/modules/songs/components/song-detail-view";
import { SongNavigationActions } from "@/src/modules/songs/components/song-navigation-actions";

import type { SetlistDetail } from "../types/setlist";

type SetlistPlayerProps = {
  canAccessScores: boolean;
  setlist: SetlistDetail;
};

export function SetlistPlayer({
  canAccessScores,
  setlist,
}: SetlistPlayerProps) {
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
      <SongNavigationActions
        nextDisabled={currentIndex === setlist.items.length - 1}
        onNext={() => goTo(currentIndex + 1)}
        onPrevious={() => goTo(currentIndex - 1)}
        position={currentIndex + 1}
        previousDisabled={currentIndex === 0}
        total={setlist.items.length}
      />
    ),
    [currentIndex, goTo, setlist.items.length],
  );

  if (!currentItem) {
    return (
      <main className="song-page">
        <div className="song-page__shell">
          <AppTopBar
            backHref="/setlist"
            backLabel="Retour aux setlists"
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
      className="song-page song-page--immersive setlist-player"
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
      <div className="song-page__shell song-page__shell--immersive">
        <AppTopBar
          actions={headerActions}
          backHref="/setlist"
          backLabel={setlist.title}
          mode="public"
        />
        <SongDetailView
          canAccessScores={canAccessScores}
          eyebrow={`${setlist.title} · ${currentIndex + 1}/${setlist.items.length}`}
          key={`${currentItem.song.id}-${currentIndex}`}
          song={currentItem.song}
        />
      </div>
    </main>
  );
}
