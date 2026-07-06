import { formatSongCollectionLabel } from "../collections/song-collection";
import type { PublicSongSummary } from "../types/public-song";

function getCollectionLabel(song: PublicSongSummary) {
  return (
    formatSongCollectionLabel(song.collection, song.collectionNumber) ??
    "Chant local"
  );
}

export function formatSongCatalogMetadata(song: PublicSongSummary) {
  return `${getCollectionLabel(song)} - ${song.author ?? "Auteur non renseigné"}`;
}

export function formatSongCollectionAndAuthor(song: PublicSongSummary) {
  return `${getCollectionLabel(song)} · ${song.author ?? "Auteur non renseigné"}`;
}
