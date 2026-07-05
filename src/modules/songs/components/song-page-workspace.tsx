"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

import type { AdminSong } from "../types/admin-song";
import type { PublicSongDetail, PublicSongSummary } from "../types/public-song";
import type { SongTaxonomies } from "../types/song-taxonomy";
import { SongDetailView } from "./song-detail-view";
import { SongNavigationActions } from "./song-navigation-actions";

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
  const [isEditionLoading, setIsEditionLoading] = useState(false);
  const readableSong = adminSong ?? song;
  const [collectionSongs, setCollectionSongs] = useState<PublicSongSummary[]>([]);

  useEffect(() => {
    setAdminSong(initialAdminSong);
    setIsEditionLoading(false);
    setMode(
      initialMode === "edition" && initialAdminSong ? "edition" : "selection",
    );
  }, [initialAdminSong, initialMode]);
  const updateMode = useCallback(
    (nextMode: "selection" | "edition") => {
      if (nextMode === "edition") {
        setIsEditionLoading(true);

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
      setIsEditionLoading(false);
      router.replace(createSongHref(readableSong.slug, {
        backHref,
        mode: nextMode,
      }), { scroll: false });
    },
    [backHref, isAuthenticated, readableSong.slug, router],
  );

  useEffect(() => {
    if (mode !== "selection" || !readableSong.collection) {
      setCollectionSongs([]);
      return;
    }

    const controller = new AbortController();

    async function loadCollectionSongs() {
      const allSongs: PublicSongSummary[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = new URL("/api/songs", window.location.origin);
        url.searchParams.set("collections", readableSong.collection ?? "");
        url.searchParams.set("limit", "50");
        url.searchParams.set("offset", String(offset));

        const response = await fetch(url, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as
          | {
              data?: {
                songs: PublicSongSummary[];
                hasMore: boolean;
              };
            }
          | null;

        if (!response.ok || !payload?.data) {
          throw new Error("Impossible de charger les chants du recueil.");
        }

        allSongs.push(...payload.data.songs);
        hasMore = payload.data.hasMore;
        offset += payload.data.songs.length;

        if (payload.data.songs.length === 0) {
          break;
        }
      }

      setCollectionSongs(allSongs);
    }

    void loadCollectionSongs().catch(() => {
      if (!controller.signal.aborted) {
        setCollectionSongs([]);
      }
    });

    return () => controller.abort();
  }, [mode, readableSong.collection]);

  const navigationActions = useMemo<ReactNode>(() => {
    if (mode !== "selection" || collectionSongs.length < 2) {
      return undefined;
    }

    const currentIndex = collectionSongs.findIndex(
      (collectionSong) => collectionSong.id === readableSong.id,
    );

    if (currentIndex === -1) {
      return undefined;
    }

    const previousSong = collectionSongs[currentIndex - 1] ?? null;
    const nextSong = collectionSongs[currentIndex + 1] ?? null;

    return (
      <SongNavigationActions
        nextDisabled={!nextSong}
        onNext={() => {
          if (nextSong) {
            router.push(createSongHref(nextSong.slug, { backHref }));
          }
        }}
        onPrevious={() => {
          if (previousSong) {
            router.push(createSongHref(previousSong.slug, { backHref }));
          }
        }}
        position={currentIndex + 1}
        previousDisabled={!previousSong}
        total={collectionSongs.length}
      />
    );
  }, [backHref, collectionSongs, mode, readableSong.id, router]);

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
            actions={navigationActions}
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
          isEditionLoading ? (
            <div aria-busy="true" className="catalog-loading" role="status">
              <span aria-hidden="true" className="catalog-loading__spinner" />
              <div>
                <strong>Chargement de l’éditeur…</strong>
                <p>Téléchargement des données du chant.</p>
              </div>
            </div>
          ) : (
            <SongDetailView
              canAccessScores={canAccessScores}
              key={readableSong.id}
              song={readableSong}
            />
          )
        )}
      </div>
    </main>
  );
}
