"use client";

import { type DragEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { useUnsavedChangesGuard } from "@/src/shared/hooks/use-unsaved-changes-guard";

import { SongCatalog } from "@/src/modules/songs/components/song-catalog";
import type {
  PublicSongCatalogPage,
  PublicSongSummary,
} from "@/src/modules/songs/types/public-song";

import type { SetlistDetail } from "../types/setlist";

type SetlistEditorProps = {
  initialCatalog: PublicSongCatalogPage;
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

type DropIndicator = {
  placement: "before" | "after";
  targetIndex: number;
};

function songLabel(song: PublicSongSummary) {
  const collection = song.collection
    ? `${song.collection}${song.collectionNumber ? ` ${String(song.collectionNumber).padStart(3, "0")}` : ""}`
    : "Chant";

  return `${collection} · ${song.title}`;
}

export function SetlistEditor({
  initialCatalog,
  initialSetlist,
}: SetlistEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSetlist.title);
  const [songIds, setSongIds] = useState(
    initialSetlist.items.map((item) => item.song.id),
  );
  const [knownSongs, setKnownSongs] = useState<PublicSongSummary[]>(() => [
    ...initialSetlist.items.map((item) => item.song),
    ...initialCatalog.songs,
  ]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      songIds: initialSetlist.items.map((item) => item.song.id),
      title: initialSetlist.title,
    }),
  );
  const songsById = useMemo(
    () => new Map(knownSongs.map((song) => [song.id, song])),
    [knownSongs],
  );
  const isDirty = useMemo(
    () =>
      JSON.stringify({
        songIds,
        title,
      }) !== savedSnapshot,
    [savedSnapshot, songIds, title],
  );

  function rememberSong(song: PublicSongSummary) {
    setKnownSongs((current) =>
      current.some((knownSong) => knownSong.id === song.id)
        ? current
        : [...current, song],
    );
  }

  function clearDragState() {
    setDraggedIndex(null);
    setDropIndicator(null);
  }

  function reorderSongs(
    sourceIndex: number,
    targetIndex: number,
    placement: "before" | "after",
  ) {
    setSongIds((current) => {
      if (sourceIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [movedSongId] = next.splice(sourceIndex, 1);
      const adjustedTargetIndex =
        sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const insertIndex =
        placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

      next.splice(insertIndex, 0, movedSongId);
      return next;
    });
  }

  function resolveDropIndicator(
    targetIndex: number,
    clientY: number,
    element: HTMLElement,
  ): DropIndicator {
    const bounds = element.getBoundingClientRect();

    return {
      placement: clientY < bounds.top + bounds.height / 2 ? "before" : "after",
      targetIndex,
    };
  }

  function findDropIndicator(clientX: number, clientY: number) {
    const hoveredElement = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-setlist-item-index]");

    if (!hoveredElement) {
      return null;
    }

    const targetIndex = Number.parseInt(
      hoveredElement.dataset.setlistItemIndex ?? "",
      10,
    );

    if (Number.isNaN(targetIndex)) {
      return null;
    }

    return resolveDropIndicator(targetIndex, clientY, hoveredElement);
  }

  function applyDrop(nextDropIndicator: DropIndicator | null) {
    if (draggedIndex === null || !nextDropIndicator) {
      clearDragState();
      return;
    }

    reorderSongs(
      draggedIndex,
      nextDropIndicator.targetIndex,
      nextDropIndicator.placement,
    );
    clearDragState();
  }

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

  function handleDragStart(index: number, event: DragEvent<HTMLElement>) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    ) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDraggedIndex(index);
    setDropIndicator(null);
  }

  function handleDragOver(index: number, event: DragEvent<HTMLElement>) {
    if (draggedIndex === null) {
      return;
    }

    event.preventDefault();
    setDropIndicator(
      resolveDropIndicator(index, event.clientY, event.currentTarget),
    );
  }

  function handleDrop(index: number, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    applyDrop(resolveDropIndicator(index, event.clientY, event.currentTarget));
  }

  function handlePointerDown(index: number, event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") {
      return;
    }

    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedIndex(index);
    setDropIndicator(null);
  }

  function handlePointerMove(index: number, event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || draggedIndex !== index) {
      return;
    }

    event.preventDefault();
    setDropIndicator(findDropIndicator(event.clientX, event.clientY));
  }

  function handlePointerUp(index: number, event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || draggedIndex !== index) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    applyDrop(findDropIndicator(event.clientX, event.clientY) ?? dropIndicator);
  }

  const saveSetlist = useCallback(async () => {
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
      return false;
    }

    setSavedSnapshot(
      JSON.stringify({
        songIds,
        title,
      }),
    );
    setMessage("Setlist enregistrée.");
    router.refresh();
    return true;
  }, [initialSetlist.id, router, songIds, title]);
  const { confirmNavigation, dialog } = useUnsavedChangesGuard({
    isDirty,
    onSave: saveSetlist,
  });

  const headerActions = useMemo(
    () => (
      <>
        <button
          className="admin-button admin-button--primary"
          onClick={() => {
            void confirmNavigation(() =>
              router.push(`/setlist/${initialSetlist.id}/play`),
            );
          }}
          type="button"
        >
          Jouer
        </button>
        <button
          className={
            isDirty
              ? "admin-button admin-button--primary admin-button--dirty"
              : "admin-button"
          }
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void saveSetlist();
            });
          }}
          type="button"
        >
          {isPending
            ? "Enregistrement…"
            : isDirty
              ? "Enregistrer •"
              : "Enregistrer"}
        </button>
      </>
    ),
    [
      confirmNavigation,
      initialSetlist.id,
      isDirty,
      isPending,
      router,
      saveSetlist,
      startTransition,
    ],
  );

  return (
    <main className="setlist-page">
      <div className="setlist-shell setlist-shell--editor">
        <AppTopBar
          actions={headerActions}
          backHref="/setlist"
          backLabel="Retour"
          mode="public"
        />

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
                    <article
                      className={[
                        "setlist-editor__item",
                        draggedIndex === index
                          ? "setlist-editor__item--dragging"
                          : "",
                        dropIndicator?.targetIndex === index &&
                        dropIndicator.placement === "before"
                          ? "setlist-editor__item--drop-before"
                          : "",
                        dropIndicator?.targetIndex === index &&
                        dropIndicator.placement === "after"
                          ? "setlist-editor__item--drop-after"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-setlist-item-index={index}
                      draggable
                      key={`${songId}-${index}`}
                      onDragEnd={clearDragState}
                      onDragOver={(event) => handleDragOver(index, event)}
                      onDragStart={(event) => handleDragStart(index, event)}
                      onDrop={(event) => handleDrop(index, event)}
                      onPointerCancel={clearDragState}
                      onPointerDown={(event) => handlePointerDown(index, event)}
                      onPointerMove={(event) => handlePointerMove(index, event)}
                      onPointerUp={(event) => handlePointerUp(index, event)}
                    >
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
        </section>

        <section
          aria-labelledby="setlist-song-catalog-title"
          className="catalog-section setlist-editor__catalog-section"
        >
          <SongCatalog
            initialCatalog={initialCatalog}
            heading="Ajouter un chant"
            headingId="setlist-song-catalog-title"
            emptyMessage="Aucun chant ne correspond à cette recherche."
            onOpenSong={(song) => {
              rememberSong(song);
              setSongIds((current) => [...current, song.id]);
            }}
            searchInputId="setlist-song-search"
            searchPlaceholder="Titre ou numéro de recueil"
            syncUrl={false}
          />
        </section>
      </div>
      {dialog}
    </main>
  );
}
