"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail } from "../types/public-song";
import type { SongTaxonomies } from "../types/song-taxonomy";
import { SongDetailView } from "./song-detail-view";

const SongEditorShell = dynamic(
  () =>
    import("./song-editor-shell").then((module) => module.SongEditorShell),
  {
    loading: () => (
      <div aria-busy="true" className="catalog-loading" role="status">
        <span aria-hidden="true" className="catalog-loading__spinner" />
        <strong>Chargement de l’éditeur…</strong>
      </div>
    ),
  },
);

type SongPageWorkspaceProps = {
  adminSong: AdminSong | null;
  backHref: string;
  canAccessScores: boolean;
  initialMode: "selection" | "edition";
  isAuthenticated: boolean;
  song: PublicSongDetail;
  availableTaxonomies: SongTaxonomies;
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
  song,
  availableTaxonomies,
}: SongPageWorkspaceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"selection" | "edition">(
    initialMode === "edition" && initialAdminSong ? "edition" : "selection",
  );
  const [adminSong, setAdminSong] = useState(initialAdminSong);
  const readableSong = adminSong ?? song;
  const updateMode = useCallback(
    (nextMode: "selection" | "edition") => {
      if (nextMode === "edition") {
        if (!isAuthenticated) {
          router.push(getLoginHref(createSongHref(readableSong.slug, {
            backHref,
            mode: "edition",
          })));
        } else {
          router.push(createSongHref(readableSong.slug, {
            backHref,
            mode: "edition",
          }));
        }

        return;
      }

      setMode(nextMode);
      router.replace(createSongHref(readableSong.slug, {
        backHref,
        mode: nextMode,
      }), { scroll: false });
    },
    [backHref, isAuthenticated, readableSong.slug, router],
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
        {mode === "selection" ? (
          <AppTopBar
            activeViewMode={mode}
            backHref={backHref}
            backIconOnly
            backLabel="Retour au répertoire"
            mode="public"
            onViewModeChange={updateMode}
          />
        ) : null}

        {mode === "edition" && adminSong ? (
          <SongEditorShell
            activeViewMode={mode}
            availableTaxonomies={availableTaxonomies}
            backHref={backHref}
            backIconOnly
            backLabel="Retour au répertoire"
            mode="admin"
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
            onViewModeChange={updateMode}
            showViewModeToggle
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
