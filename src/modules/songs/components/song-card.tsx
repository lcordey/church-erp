import type { PublicSongSummary } from "../types/public-song";
import { MusicalKeyText } from "./musical-key-text";

type SongCardProps = {
  song: PublicSongSummary;
  index: number;
  isActive?: boolean;
  mode?: "selection" | "edition";
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

export function SongCard({
  song,
  index,
  isActive = false,
  mode = "selection",
  onOpen,
  onEdit,
}: SongCardProps) {
  const collectionLabel = song.collectionNumber
    ? `${song.collection} ${String(song.collectionNumber).padStart(3, "0")}`
    : song.collection;

  return (
    <article
      className={`song-card${isActive ? " song-card--active" : ""}`}
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
      ) : null}
    </article>
  );
}
