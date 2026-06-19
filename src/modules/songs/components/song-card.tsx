import { useEffect, useRef, useState } from "react";

import { formatSongCollectionLabel } from "../collections/song-collection";
import type { PublicSongSummary } from "../types/public-song";
import { MusicalKeyText } from "./musical-key-text";

type SongCardProps = {
  song: PublicSongSummary;
  index: number;
  isActive?: boolean;
  mode?: "selection" | "edition";
  showOpenIndicator?: boolean;
  onAddToSetlist?: (song: PublicSongSummary) => void;
  onOpen?: (song: PublicSongSummary) => void;
  onEdit?: (song: PublicSongSummary) => void;
};

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 16-.8 4.8L8 20l10.5-10.5-4-4L4 16Z" />
      <path d="m13.5 6.5 4 4" />
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

export function SongCard({
  song,
  index,
  isActive = false,
  mode = "selection",
  showOpenIndicator = true,
  onAddToSetlist,
  onOpen,
  onEdit,
}: SongCardProps) {
  const hasQuickActions = mode === "selection" && Boolean(onEdit || onAddToSetlist);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const collectionLabel = formatSongCollectionLabel(
    song.collection,
    song.collectionNumber,
  );

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
      className={`song-card${isActive ? " song-card--active" : ""}${
        isMenuOpen ? " song-card--menu-open" : ""
      }`}
      style={{ "--card-index": index } as React.CSSProperties}
    >
      <button
        className="song-card__open"
        onClick={() => onOpen?.(song)}
        type="button"
      >
        <span className="song-card__number">
          {song.collection && song.collectionNumber
            ? String(song.collectionNumber).padStart(3, "0")
            : String(index + 1).padStart(2, "0")}
        </span>
        <span className="song-card__content">
          <span className="song-card__title">{song.title}</span>
          <span className="song-card__metadata">
            {collectionLabel ?? "Chant local"}
            {song.author ? ` · ${song.author}` : ""}
            {song.defaultKey ? (
              <>
                {" · Tonalité "}
                <MusicalKeyText musicalKey={song.defaultKey} />
              </>
            ) : null}
          </span>
        </span>
        {mode === "edition" ? (
          <span className="song-card__action-space" aria-hidden="true" />
        ) : hasQuickActions ? (
          <span className="song-card__action-space" aria-hidden="true" />
        ) : !showOpenIndicator ? (
          <span className="song-card__action-space" aria-hidden="true" />
        ) : (
          <span className="song-card__arrow" aria-hidden="true">
            ↗
          </span>
        )}
      </button>
      {mode === "edition" ? (
        <button
          aria-label={`Éditer ${song.title}`}
          className="song-card__edit"
          onClick={() => onEdit?.(song)}
          type="button"
        >
          <EditIcon />
        </button>
      ) : hasQuickActions ? (
        <div className="song-card__menu" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={`Actions pour ${song.title}`}
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
              {onEdit ? (
                <button
                  onClick={(event) => {
                    stopEvent(event);
                    setIsMenuOpen(false);
                    onEdit(song);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  role="menuitem"
                  type="button"
                >
                  Modifier le chant
                </button>
              ) : null}
              {onAddToSetlist ? (
                <button
                  onClick={(event) => {
                    stopEvent(event);
                    setIsMenuOpen(false);
                    onAddToSetlist(song);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  role="menuitem"
                  type="button"
                >
                  Ajouter à une setlist
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
