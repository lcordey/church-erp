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
  backHref: string;
  canAccessScores: boolean;
  initialMode: "selection" | "edition";
  isAuthenticated: boolean;
  navigation: PublicSongNavigation | null;
  song: PublicSongDetail;
};

function createSongHref(
  slug: string,
  options: {
    backHref: string;
    mode?: "selection" | "edition";
  },
) {
  const url = new URL(`/chants/${slug}`, "http://localhost");

  if (options.mode === "edition") {
    url.searchParams.set("mode", "edition");
  }

  if (options.backHref !== "/worship") {
    url.searchParams.set("returnTo", options.backHref);
  }

  return `${url.pathname}${url.search}`;
}

export function SongPageWorkspace({
  adminSong: initialAdminSong,
  backHref,
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
        router.push(createSongHref(slug, { backHref }));
      }
    },
    [backHref, router],
  );

  const updateMode = useCallback(
    (nextMode: "selection" | "edition") => {
      if (nextMode === "edition" && !adminSong) {
        if (!isAuthenticated) {
          router.push(getLoginHref(createSongHref(readableSong.slug, {
            backHref,
            mode: "edition",
          })));
        }

        return;
      }

      setMode(nextMode);
      router.replace(createSongHref(readableSong.slug, {
        backHref,
        mode: nextMode,
      }), { scroll: false });
    },
    [adminSong, backHref, isAuthenticated, readableSong.slug, router],
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
          backHref={backHref}
          backIconOnly
          backLabel="Retour au répertoire"
          mode={mode === "edition" ? "admin" : "public"}
          onViewModeChange={updateMode}
        />

        {mode === "edition" && adminSong ? (
          <AdminSongForm
            onDeleted={() => router.push(backHref)}
            onSaved={(savedSong) => {
              setAdminSong(savedSong);
              router.replace(createSongHref(savedSong.slug, {
                backHref,
                mode: "edition",
              }), {
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
