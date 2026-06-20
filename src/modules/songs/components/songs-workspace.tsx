"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { PublicSongCatalogPage, PublicSongSummary } from "../types/public-song";
import { SongCatalog } from "./song-catalog";
import type { SetlistDetail, SetlistSummary } from "@/src/modules/setlists/types/setlist";

type SongsWorkspaceProps = {
  initialCollections?: string[];
  initialSearch?: string;
  initialCatalog: PublicSongCatalogPage;
};

export function SongsWorkspace({
  initialCollections,
  initialSearch = "",
  initialCatalog,
}: SongsWorkspaceProps) {
  const router = useRouter();
  const [setlistMessage, setSetlistMessage] = useState("");
  const [isSetlistDialogOpen, setIsSetlistDialogOpen] = useState(false);
  const [isSetlistDialogPending, setIsSetlistDialogPending] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PublicSongSummary | null>(null);
  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);

  function openSong(song: PublicSongSummary) {
    router.push(`/chants/${song.slug}`);
  }

  async function openSetlistDialog(song: PublicSongSummary) {
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
        className="admin-button admin-button--primary"
        href="/admin/chants/nouveau"
      >
        Nouveau chant
      </Link>
    ),
    [],
  );

  return (
    <main className="catalog-page">
      <div className="catalog-page__glow" aria-hidden="true" />
      <div className="catalog-shell">
        <AppTopBar actions={headerActions} mode="public" />

        <section className="catalog-hero">
          <div>
            <p className="eyebrow">Équipe louange</p>
            <h1>Des chants prêts à être partagés.</h1>
          </div>
          <p className="catalog-hero__intro">
            Retrouvez les paroles, accords et informations utiles des chants
            publiés par l’équipe.
          </p>
        </section>

        <div className="catalog-workspace">
          <section className="catalog-section" aria-labelledby="catalog-title">
            <SongCatalog
              initialCatalog={initialCatalog}
              initialCollections={initialCollections}
              initialSearch={initialSearch}
              onAddToSetlist={openSetlistDialog}
              onEditSong={(song) => router.push(`/admin/chants/${song.id}`)}
              onOpenSong={openSong}
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

        <footer className="site-footer">
          <span>Lecture publique</span>
          <span>Mis à jour par l’équipe louange</span>
        </footer>
      </div>
    </main>
  );
}
