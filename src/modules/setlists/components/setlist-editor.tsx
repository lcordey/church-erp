"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { PublicSongSummary } from "@/src/modules/songs/types/public-song";

import type { SetlistDetail } from "../types/setlist";

type SetlistEditorProps = {
  availableSongs: PublicSongSummary[];
  initialSetlist: SetlistDetail;
};

type ApiError = {
  error?: {
    message?: string;
    fields?: {
      title?: string;
      songIds?: string;
    };
  };
};

function songLabel(song: PublicSongSummary) {
  const collection = song.collection
    ? `${song.collection}${song.collectionNumber ? ` ${String(song.collectionNumber).padStart(3, "0")}` : ""}`
    : "Chant";

  return `${collection} · ${song.title}`;
}

export function SetlistEditor({
  availableSongs,
  initialSetlist,
}: SetlistEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSetlist.title);
  const [search, setSearch] = useState("");
  const [songIds, setSongIds] = useState(
    initialSetlist.items.map((item) => item.song.id),
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const songsById = useMemo(
    () => new Map(availableSongs.map((song) => [song.id, song])),
    [availableSongs],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSongs = availableSongs.filter((song) =>
    songLabel(song).toLowerCase().includes(normalizedSearch),
  );

  function moveSong(index: number, direction: -1 | 1) {
    setSongIds((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  async function saveSetlist() {
    setMessage("");

    const response = await fetch(`/api/setlists/${initialSetlist.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, songIds }),
    });
    const payload = (await response.json()) as ApiError & {
      data?: SetlistDetail;
    };

    if (!response.ok || !payload.data) {
      setMessage(
        payload.error?.fields?.title ??
          payload.error?.fields?.songIds ??
          payload.error?.message ??
          "Impossible d’enregistrer la setlist.",
      );
      return;
    }

    setMessage("Setlist enregistrée.");
    router.refresh();
  }

  return (
    <main className="setlist-page">
      <div className="setlist-shell setlist-shell--editor">
        <header className="app-top-bar">
          <div className="app-top-bar__identity">
            <Link className="app-top-bar__back" href="/setlist">
              <span aria-hidden="true">←</span>
              Retour aux setlists
            </Link>
          </div>
          <div className="app-top-bar__actions">
            <Link
              className="admin-button admin-button--primary"
              href={`/setlist/${initialSetlist.id}/play`}
            >
              Jouer
            </Link>
            <button
              className="admin-button"
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  void saveSetlist();
                });
              }}
              type="button"
            >
              Enregistrer
            </button>
          </div>
        </header>

        <section className="setlist-editor">
          <div className="setlist-editor__panel">
            <label className="field" htmlFor="setlist-editor-title">
              <span>Titre</span>
              <input
                id="setlist-editor-title"
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>

            <div className="catalog-section__heading">
              <div>
                <h2>Chants de la setlist</h2>
              </div>
              <div className="catalog-section__heading-actions">
                <span>
                  {songIds.length} {songIds.length > 1 ? "chants" : "chant"}
                </span>
              </div>
            </div>

            <div className="setlist-editor__items">
              {songIds.length > 0 ? (
                songIds.map((songId, index) => {
                  const song = songsById.get(songId);

                  if (!song) {
                    return null;
                  }

                  return (
                    <article className="setlist-editor__item" key={`${songId}-${index}`}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{song.title}</strong>
                        <small>{songLabel(song)}</small>
                      </div>
                      <div>
                        <button
                          aria-label="Monter le chant"
                          disabled={index === 0}
                          onClick={() => moveSong(index, -1)}
                          type="button"
                        >
                          ↑
                        </button>
                        <button
                          aria-label="Descendre le chant"
                          disabled={index === songIds.length - 1}
                          onClick={() => moveSong(index, 1)}
                          type="button"
                        >
                          ↓
                        </button>
                        <button
                          aria-label="Retirer le chant"
                          onClick={() =>
                            setSongIds((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">
                  <p>Ajoute des chants pour préparer cette setlist.</p>
                </div>
              )}
            </div>

            {message ? <p className="form-message">{message}</p> : null}
          </div>

          <aside className="setlist-editor__catalog">
            <form
              className="catalog-search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="setlist-song-search">Ajouter un chant</label>
              <div className="catalog-search__row">
                <input
                  id="setlist-song-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Titre ou recueil"
                  value={search}
                />
              </div>
            </form>
            <div className="setlist-song-picker">
              {filteredSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => setSongIds((current) => [...current, song.id])}
                  type="button"
                >
                  <strong>{song.title}</strong>
                  <small>{songLabel(song)}</small>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
