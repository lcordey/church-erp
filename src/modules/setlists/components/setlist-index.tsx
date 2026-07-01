"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

import type { SetlistDetail, SetlistSummary } from "../types/setlist";

type SetlistIndexProps = {
  initialSetlists: SetlistSummary[];
  isAuthenticated: boolean;
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

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function stopEvent(event: {
  stopPropagation: () => void;
}) {
  event.stopPropagation();
}

type SetlistCardProps = {
  index: number;
  openHref: string;
  isAuthenticated: boolean;
  isPending: boolean;
  onDelete: (setlist: SetlistSummary) => void;
  onEdit: (setlist: SetlistSummary) => void;
  setlist: SetlistSummary;
};

function SetlistCard({
  index,
  isAuthenticated,
  isPending,
  openHref,
  onDelete,
  onEdit,
  setlist,
}: SetlistCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <article
      className={`song-card setlist-card${isMenuOpen ? " song-card--menu-open" : ""}`}
      style={{ "--card-index": index } as React.CSSProperties}
    >
      <Link className="song-card__open" href={openHref}>
        <span className="song-card__content">
          <span className="song-card__title">{setlist.title}</span>
          <span className="song-card__metadata">
            {setlist.songCount} {setlist.songCount > 1 ? "chants" : "chant"}
          </span>
        </span>
        {isAuthenticated ? (
          <span className="song-card__action-space" aria-hidden="true" />
        ) : null}
      </Link>

      {isAuthenticated ? (
        <div className="song-card__menu" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={`Actions pour ${setlist.title}`}
            className="song-card__edit"
            onClick={(event) => {
              stopEvent(event);
              setIsMenuOpen((current) => !current);
            }}
            onPointerDown={stopEvent}
            type="button"
          >
            <MoreIcon />
          </button>
          {isMenuOpen ? (
            <div
              className="song-card__menu-popover"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              role="menu"
            >
              <button
                onClick={(event) => {
                  stopEvent(event);
                  setIsMenuOpen(false);
                  onEdit(setlist);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                role="menuitem"
                type="button"
              >
                Modifier la setlist
              </button>
              <button
                disabled={isPending}
                onClick={(event) => {
                  stopEvent(event);
                  setIsMenuOpen(false);
                  onDelete(setlist);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                role="menuitem"
                type="button"
              >
                Supprimer la setlist
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function SetlistIndex({
  initialSetlists,
  isAuthenticated,
}: SetlistIndexProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [setlists, setSetlists] = useState(initialSetlists);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

  const headerActions = useMemo(() => {
    if (!isAuthenticated) {
      return (
        <Link
          aria-label="Créer une setlist"
          className="icon-button icon-button--primary"
          href={getLoginHref("/setlist")}
          title="Créer une setlist"
        >
          <PlusIcon />
          <span className="sr-only">Créer une setlist</span>
        </Link>
      );
    }

    return (
      <button
        aria-label="Créer une setlist"
        className="icon-button icon-button--primary"
        onClick={() => {
          setMessage("");
          setTitle("");
          setIsCreateDialogOpen(true);
        }}
        title="Créer une setlist"
        type="button"
      >
        <PlusIcon />
        <span className="sr-only">Créer une setlist</span>
      </button>
    );
  }, [isAuthenticated]);

  return (
    <main className="setlist-page">
      <div className="setlist-shell">
        <AppTopBar actions={headerActions} mode="public" />

        {message && !isCreateDialogOpen ? <p className="form-message">{message}</p> : null}

        <section className="setlist-list" aria-label="Setlists">
          {setlists.length > 0 ? (
            <div className="setlist-cards">
              {setlists.map((setlist, index) => (
                <SetlistCard
                  index={index}
                  isAuthenticated={isAuthenticated}
                  isPending={isPending}
                  key={setlist.id}
                  openHref={`/setlist/${setlist.id}/play`}
                  onDelete={(nextSetlist) => {
                    startTransition(() => {
                      void deleteSetlist(nextSetlist);
                    });
                  }}
                  onEdit={(nextSetlist) => router.push(`/setlist/${nextSetlist.id}`)}
                  setlist={setlist}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Aucune setlist n’a encore été créée.</p>
            </div>
          )}
        </section>

        {isCreateDialogOpen ? (
          <div
            aria-modal="true"
            className="app-dialog-backdrop"
            onClick={() => {
              if (!isPending) {
                setIsCreateDialogOpen(false);
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
                  <h2>Créer une setlist</h2>
                </div>
                <button
                  aria-label="Fermer"
                  className="icon-button"
                  disabled={isPending}
                  onClick={() => setIsCreateDialogOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <form
                className="setlist-create-dialog"
                onSubmit={(event) => {
                  event.preventDefault();
                  startTransition(() => {
                    void createSetlist();
                  });
                }}
              >
                <label htmlFor="setlist-title">Titre</label>
                <input
                  id="setlist-title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Dimanche matin"
                  value={title}
                />
                {message ? <p className="form-message">{message}</p> : null}
                <div className="setlist-create-dialog__actions">
                  <button
                    className="admin-button admin-button--quiet"
                    disabled={isPending}
                    onClick={() => setIsCreateDialogOpen(false)}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="admin-button admin-button--primary"
                    disabled={isPending}
                    type="submit"
                  >
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
