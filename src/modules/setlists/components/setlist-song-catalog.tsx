"use client";

import { SongCatalog } from "@/src/modules/songs/components/song-catalog";
import type {
  PublicSongCatalogPage,
  PublicSongSummary,
} from "@/src/modules/songs/types/public-song";

const initialCatalogPageSize = 20;

const emptyCatalog: PublicSongCatalogPage = {
  songs: [],
  total: 0,
  limit: initialCatalogPageSize,
  offset: 0,
  hasMore: false,
  collections: [],
  themes: [],
  labels: [],
};

type SetlistSongCatalogProps = {
  onOpenSong: (song: PublicSongSummary) => void;
};

export function SetlistSongCatalog({
  onOpenSong,
}: SetlistSongCatalogProps) {
  return (
    <SongCatalog
      emptyMessage="Aucun chant ne correspond à cette recherche."
      heading="Ajouter un chant"
      headingId="setlist-song-catalog-title"
      initialCatalog={emptyCatalog}
      loadOnMount
      onOpenSong={onOpenSong}
      searchInputId="setlist-song-search"
      searchPlaceholder="Titre, auteur ou numéro de recueil"
      syncUrl={false}
    />
  );
}
