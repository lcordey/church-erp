"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { SetlistDetail, SetlistSummary } from "../types/setlist";

type SetlistIndexProps = {
  initialSetlists: SetlistSummary[];
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

export function SetlistIndex({ initialSetlists }: SetlistIndexProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [setlists, setSetlists] = useState(initialSetlists);
  const [isPending, startTransition] = useTransition();

  async function createSetlist() {
    setMessage("");

    const response = await fetch("/api/setlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, songIds: [] }),
    });
    const payload = (await response.json()) as ApiError & {
      data?: SetlistDetail;
    };

    if (!response.ok || !payload.data) {
      setMessage(
        payload.error?.fields?.title ??
          payload.error?.message ??
          "Impossible de créer la setlist.",
      );
      return;
    }

    router.push(`/setlist/${payload.data.id}`);
  }

  async function deleteSetlist(setlist: SetlistSummary) {
    const confirmed = window.confirm(
      `Supprimer définitivement la setlist « ${setlist.title} » ?`,
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/setlists/${setlist.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiError | null;
      setMessage(payload?.error?.message ?? "Impossible de supprimer la setlist.");
      return;
    }

    setSetlists((current) => current.filter((item) => item.id !== setlist.id));
    router.refresh();
  }

  return (
    <main className="setlist-page">
      <div className="setlist-shell">
        <AppTopBar mode="public" />

        <section className="setlist-hero">
          <div>
            <p className="eyebrow">Setlist</p>
            <h1>Préparer les séquences de chants.</h1>
          </div>
          <form
            className="setlist-create"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(() => {
                void createSetlist();
              });
            }}
          >
            <label htmlFor="setlist-title">Nouvelle setlist</label>
            <div>
              <input
                id="setlist-title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Dimanche matin"
                value={title}
              />
              <button disabled={isPending} type="submit">
                Créer
              </button>
            </div>
            {message ? <p className="form-message">{message}</p> : null}
          </form>
        </section>

        <section className="setlist-list" aria-labelledby="setlist-list-title">
          <div className="catalog-section__heading">
            <div>
              <h2 id="setlist-list-title">Setlists</h2>
            </div>
            <div className="catalog-section__heading-actions">
              <span>
                {setlists.length} {setlists.length > 1 ? "setlists" : "setlist"}
              </span>
            </div>
          </div>

          {setlists.length > 0 ? (
            <div className="setlist-cards">
              {setlists.map((setlist) => (
                <article className="setlist-card" key={setlist.id}>
                  <div>
                    <h3>{setlist.title}</h3>
                    <p>
                      {setlist.songCount}{" "}
                      {setlist.songCount > 1 ? "chants" : "chant"}
                    </p>
                  </div>
                  <div className="setlist-card__actions">
                    <Link className="admin-button admin-button--primary" href={`/setlist/${setlist.id}/play`}>
                      Jouer
                    </Link>
                    <Link className="admin-button" href={`/setlist/${setlist.id}`}>
                      Modifier
                    </Link>
                    <button
                      className="admin-button admin-button--danger"
                      onClick={() => {
                        startTransition(() => {
                          void deleteSetlist(setlist);
                        });
                      }}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Aucune setlist n’a encore été créée.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
