"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

import type { PublicSongCatalogPage, PublicSongSummary } from "../types/public-song";
import { SongCatalog } from "./song-catalog";
import type { SetlistDetail, SetlistSummary } from "@/src/modules/setlists/types/setlist";

type SongsWorkspaceProps = {
  initialCollections?: string[];
  initialSearch?: string;
  initialCatalog: PublicSongCatalogPage;
  isAuthenticated?: boolean;
  loadCatalogOnMount?: boolean;
};

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function SongsWorkspace({
  initialCollections,
  initialSearch = "",
  initialCatalog,
  isAuthenticated = true,
  loadCatalogOnMount = false,
}: SongsWorkspaceProps) {
  const router = useRouter();
  const [setlistMessage, setSetlistMessage] = useState("");
  const [isSetlistDialogOpen, setIsSetlistDialogOpen] = useState(false);
  const [isSetlistDialogPending, setIsSetlistDialogPending] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PublicSongSummary | null>(null);
  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);

  function openSong(song: PublicSongSummary) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const songUrl = new URL(`/chants/${song.slug}`, window.location.origin);
    songUrl.searchParams.set("returnTo", returnTo);
    router.push(`${songUrl.pathname}${songUrl.search}`);
  }

  async function openSetlistDialog(song: PublicSongSummary) {
    if (!isAuthenticated) {
      router.push(
        getLoginHref(
          `${window.location.pathname}${window.location.search}`,
        ),
      );
      return;
    }

    setSetlistMessage("");
    setSelectedSong(song);
    setIsSetlistDialogOpen(true);
    setIsSetlistDialogPending(true);

    const response = await fetch("/api/setlists");
    const payload = (await response.json().catch(() => null)) as
      | { data?: SetlistSummary[]; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setSetlistMessage(
        payload?.error?.message ?? "Impossible de charger les setlists.",
      );
      setSetlists([]);
      setIsSetlistDialogPending(false);
      return;
    }

    setSetlists(payload.data);
    setIsSetlistDialogPending(false);
  }

  async function addSongToSetlist(setlist: SetlistSummary) {
    if (!selectedSong) {
      return;
    }

    setIsSetlistDialogPending(true);
    setSetlistMessage("");

    const detailResponse = await fetch(`/api/setlists/${setlist.id}`);
    const detailPayload = (await detailResponse.json().catch(() => null)) as
      | { data?: SetlistDetail; error?: { message?: string } }
      | null;

    if (!detailResponse.ok || !detailPayload?.data) {
      setSetlistMessage(
        detailPayload?.error?.message ?? "Impossible de charger cette setlist.",
      );
      setIsSetlistDialogPending(false);
      return;
    }

    const setlistDetail = detailPayload.data;
    const songIds = [...setlistDetail.items.map((item) => item.song.id), selectedSong.id];
    const updateResponse = await fetch(`/api/setlists/${setlist.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: setlistDetail.title,
        songIds,
      }),
    });
    const updatePayload = (await updateResponse.json().catch(() => null)) as
      | { data?: SetlistDetail; error?: { message?: string } }
      | null;

    if (!updateResponse.ok || !updatePayload?.data) {
      setSetlistMessage(
        updatePayload?.error?.message ?? "Impossible d’ajouter ce chant à la setlist.",
      );
      setIsSetlistDialogPending(false);
      return;
    }

    setSetlistMessage(`Ajouté à « ${setlist.title} ».`);
    setIsSetlistDialogPending(false);
    setIsSetlistDialogOpen(false);
  }

  const headerActions = useMemo(
    () => (
      <Link
        aria-label="Créer un chant"
        className="icon-button icon-button--primary"
        href={isAuthenticated ? "/admin/chants/nouveau" : getLoginHref("/admin/chants/nouveau")}
        title="Créer un chant"
      >
        <PlusIcon />
        <span className="sr-only">Créer un chant</span>
      </Link>
    ),
    [isAuthenticated],
  );

  return (
    <main className="catalog-page">
      <div className="catalog-page__glow" aria-hidden="true" />
      <div className="catalog-shell">
        <AppTopBar actions={headerActions} mode="public" />

        <div className="catalog-workspace">
          <section className="catalog-section" aria-label="Répertoire">
            <SongCatalog
              initialCatalog={initialCatalog}
              initialCollections={initialCollections}
              initialSearch={initialSearch}
              loadOnMount={loadCatalogOnMount}
              onAddToSetlist={isAuthenticated ? openSetlistDialog : undefined}
              onEditSong={
                isAuthenticated
                  ? (song) => router.push(`/admin/chants/${song.id}`)
                  : undefined
              }
              onOpenSong={openSong}
              showHeading={false}
            />
          </section>
        </div>

        {isSetlistDialogOpen && selectedSong ? (
          <div
            aria-modal="true"
            className="app-dialog-backdrop"
            onClick={() => {
              if (!isSetlistDialogPending) {
                setIsSetlistDialogOpen(false);
              }
            }}
            role="dialog"
          >
            <div
              className="app-dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="app-dialog__header">
                <div>
                  <p className="eyebrow">Setlist</p>
                  <h2>Ajouter « {selectedSong.title} »</h2>
                </div>
                <button
                  aria-label="Fermer"
                  className="icon-button"
                  disabled={isSetlistDialogPending}
                  onClick={() => setIsSetlistDialogOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              {setlistMessage ? (
                <p className="form-message">{setlistMessage}</p>
              ) : null}

              <div className="app-dialog__body">
                {isSetlistDialogPending ? (
                  <p>Chargement des setlists…</p>
                ) : setlists.length > 0 ? (
                  <div className="app-dialog__list">
                    {setlists.map((setlist) => (
                      <button
                        className="app-dialog__list-item"
                        key={setlist.id}
                        onClick={() => void addSongToSetlist(setlist)}
                        type="button"
                      >
                        <strong>{setlist.title}</strong>
                        <small>
                          {setlist.songCount}{" "}
                          {setlist.songCount > 1 ? "chants" : "chant"}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>Aucune setlist disponible.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </main>
  );
}
