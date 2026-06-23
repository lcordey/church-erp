"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail } from "../types/public-song";
import { AdminSongForm } from "./admin-song-form";
import { SongDetailView } from "./song-detail-view";

type SongPageWorkspaceProps = {
  adminSong: AdminSong | null;
  canAccessScores: boolean;
  initialMode: "selection" | "edition";
  song: PublicSongDetail;
};

export function SongPageWorkspace({
  adminSong: initialAdminSong,
  canAccessScores,
  initialMode,
  song,
}: SongPageWorkspaceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"selection" | "edition">(
    initialMode === "edition" && initialAdminSong ? "edition" : "selection",
  );
  const [adminSong, setAdminSong] = useState(initialAdminSong);
  const readableSong = adminSong ?? song;

  const updateMode = useCallback(
    (nextMode: "selection" | "edition") => {
      if (nextMode === "edition" && !adminSong) {
        return;
      }

      setMode(nextMode);
      router.replace(
        nextMode === "edition"
          ? `/chants/${readableSong.slug}?mode=edition`
          : `/chants/${readableSong.slug}`,
        { scroll: false },
      );
    },
    [adminSong, readableSong.slug, router],
  );

  return (
    <main className={mode === "edition" ? "admin-page admin-page--editor" : "song-page"}>
      <div
        className={
          mode === "edition" ? "admin-editor-shell" : "song-page__shell"
        }
      >
        <AppTopBar
          activeViewMode={mode}
          backHref="/worship"
          backLabel="Retour au répertoire"
          mode={mode === "edition" ? "admin" : "public"}
          onViewModeChange={updateMode}
        />

        {mode === "edition" && adminSong ? (
          <AdminSongForm
            onDeleted={() => router.push("/worship")}
            onSaved={(savedSong) => {
              setAdminSong(savedSong);
              router.replace(`/chants/${savedSong.slug}?mode=edition`, {
                scroll: false,
              });
            }}
            showBackAction={false}
            song={adminSong}
          />
        ) : (
          <SongDetailView canAccessScores={canAccessScores} song={readableSong} />
        )}
      </div>
    </main>
  );
}
