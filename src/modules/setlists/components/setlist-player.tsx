"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { SongDetailView } from "@/src/modules/songs/components/song-detail-view";
import { SongNavigationActions } from "@/src/modules/songs/components/song-navigation-actions";
import { useViewModeNavigation } from "@/src/shared/hooks/use-view-mode-navigation";

import type { SetlistDetail, SetlistItemNotes, SetlistTeamNote } from "../types/setlist";
import { SetlistShareActions } from "./setlist-share-actions";
import { SetlistSongNotes } from "./setlist-song-notes";

type SetlistPlayerProps = {
  canAccessScores: boolean;
  canManage?: boolean;
  initialNotes?: SetlistItemNotes[];
  setlist: SetlistDetail;
};

export function SetlistPlayer({
  canAccessScores,
  canManage = false,
  initialNotes = [],
  setlist,
}: SetlistPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notesByItemId, setNotesByItemId] = useState(
    () => new Map(initialNotes.map((notes) => [notes.setlistItemId, notes])),
  );
  const { navigateToViewMode, pendingViewMode, transitionStatus } = useViewModeNavigation({
    detail: "La setlist est en cours de rechargement.",
    subject: "de la setlist",
  });
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
        <SetlistShareActions setlistId={setlist.id} setlistTitle={setlist.title} />
        <SongNavigationActions
          nextDisabled={currentIndex === setlist.items.length - 1}
          onNext={() => goTo(currentIndex + 1)}
          onPrevious={() => goTo(currentIndex - 1)}
          position={currentIndex + 1}
          previousDisabled={currentIndex === 0}
          total={setlist.items.length}
        />
      </>
    ),
    [currentIndex, goTo, setlist.id, setlist.items.length, setlist.title],
  );

  if (!currentItem) {
    return (
      <main className="song-page">
        <div className="song-page__shell">
          <AppTopBar
            backHref="/setlist"
            backIconOnly
            backLabel="Retour aux setlists"
            mode="public"
            actions={headerActions}
            activeViewMode="selection"
            onViewModeChange={canManage ? (mode) => {
              if (mode === "edition") {
                navigateToViewMode(mode, () => router.push(`/setlist/${setlist.id}?mode=edition`));
              }
            } : undefined}
            pendingViewMode={pendingViewMode}
          />
          <div className="empty-state">
            <p>Cette setlist ne contient pas encore de chant.</p>
          </div>
        </div>
        {transitionStatus}
      </main>
    );
  }

  return (
    <main className="song-page song-page--immersive setlist-player">
      <div className="song-page__shell song-page__shell--immersive">
        <AppTopBar
          activeViewMode="selection"
          actions={headerActions}
          backHref="/setlist"
          backIconOnly
          backLabel={setlist.title}
          mode="public"
          onViewModeChange={canManage ? (mode) => {
            if (mode === "edition") {
              navigateToViewMode(mode, () => router.push(`/setlist/${setlist.id}?mode=edition`));
            }
          } : undefined}
          pendingViewMode={pendingViewMode}
        />
        <SongDetailView
          canAccessScores={canAccessScores}
          eyebrow={`${setlist.title} · ${currentIndex + 1}/${setlist.items.length}`}
          key={`${currentItem.song.id}-${currentIndex}`}
          loginRedirectTo={`/setlist/${setlist.id}`}
          notesPanel={canManage ? (
            <SetlistSongNotes
              key={currentItem.id}
              notes={notesByItemId.get(currentItem.id)}
              onPersonalNoteSaved={(personalNote) => {
                setNotesByItemId((current) => {
                  const next = new Map(current);
                  const previous = next.get(currentItem.id);
                  next.set(currentItem.id, {
                    setlistItemId: currentItem.id,
                    teamNote: previous?.teamNote ?? null,
                    personalNote,
                  });
                  return next;
                });
              }}
              onTeamNoteSaved={(teamNote: SetlistTeamNote | null) => {
                setNotesByItemId((current) => {
                  const next = new Map(current);
                  const previous = next.get(currentItem.id);
                  next.set(currentItem.id, {
                    setlistItemId: currentItem.id,
                    teamNote,
                    personalNote: previous?.personalNote ?? null,
                  });
                  return next;
                });
              }}
              setlistId={setlist.id}
              setlistItemId={currentItem.id}
            />
          ) : undefined}
          song={currentItem.song}
        />
      </div>
      {transitionStatus}
    </main>
  );
}
