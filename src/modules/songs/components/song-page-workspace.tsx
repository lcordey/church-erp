"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

import type { AdminSong } from "../types/admin-song";
import type {
  PublicSongDetail,
  PublicSongNavigation,
} from "../types/public-song";
import { AdminSongForm } from "./admin-song-form";
import { SongDetailView } from "./song-detail-view";
import { SongNavigationActions } from "./song-navigation-actions";

type SongPageWorkspaceProps = {
  adminSong: AdminSong | null;
  canAccessScores: boolean;
  initialMode: "selection" | "edition";
  isAuthenticated: boolean;
  navigation: PublicSongNavigation | null;
  song: PublicSongDetail;
};

export function SongPageWorkspace({
  adminSong: initialAdminSong,
  canAccessScores,
  initialMode,
  isAuthenticated,
  navigation,
  song,
}: SongPageWorkspaceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"selection" | "edition">(
    initialMode === "edition" && initialAdminSong ? "edition" : "selection",
  );
  const [adminSong, setAdminSong] = useState(initialAdminSong);
  const readableSong = adminSong ?? song;
  const navigateToSong = useCallback(
    (slug: string | null) => {
      if (slug) {
        router.push(`/chants/${slug}`);
      }
    },
    [router],
  );

  const updateMode = useCallback(
    (nextMode: "selection" | "edition") => {
      if (nextMode === "edition" && !adminSong) {
        if (!isAuthenticated) {
          router.push(
            getLoginHref(`/chants/${readableSong.slug}?mode=edition`),
          );
        }

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
    [adminSong, isAuthenticated, readableSong.slug, router],
  );
  const headerActions = useMemo(
    () =>
      mode === "selection" && navigation ? (
        <SongNavigationActions
          nextDisabled={!navigation.nextSlug}
          onNext={() => navigateToSong(navigation.nextSlug)}
          onPrevious={() => navigateToSong(navigation.previousSlug)}
          position={navigation.position}
          previousDisabled={!navigation.previousSlug}
          total={navigation.total}
        />
      ) : null,
    [mode, navigateToSong, navigation],
  );

  return (
    <main
      className={
        mode === "edition"
          ? "admin-page admin-page--editor"
          : "song-page song-page--immersive"
      }
    >
      <div
        className={
          mode === "edition"
            ? "admin-editor-shell"
            : "song-page__shell song-page__shell--immersive"
        }
      >
        <AppTopBar
          activeViewMode={mode}
          actions={headerActions}
          backHref="/worship"
          backIconOnly
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
          <SongDetailView
            canAccessScores={canAccessScores}
            key={readableSong.id}
            song={readableSong}
          />
        )}
      </div>
    </main>
  );
}
