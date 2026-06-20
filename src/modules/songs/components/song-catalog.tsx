"use client";

import { getSongCollectionLabel } from "../collections/song-collection";
import type { PublicSongCatalogPage, PublicSongSummary } from "../types/public-song";
import { SongCard } from "./song-card";
import { useSongCatalogQuery } from "./use-song-catalog-query";

type SongCatalogProps = {
  initialCatalog: PublicSongCatalogPage;
  initialCollections?: string[];
  initialSearch?: string;
  activeMode?: "selection" | "edition";
  activeSongSlug?: string | null;
  heading?: string;
  headingId?: string;
  emptyMessage?: string;
  onAddToSetlist?: (song: PublicSongSummary) => void;
  onEditSong?: (song: PublicSongSummary) => void;
  onOpenSong?: (song: PublicSongSummary) => void;
  searchInputId?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  showOpenIndicator?: boolean;
  syncUrl?: boolean;
};

function getCollectionLabel(collection: string): string {
  return getSongCollectionLabel(collection);
}

export function SongCatalog({
  initialCollections,
  initialCatalog,
  initialSearch = "",
  activeMode = "selection",
  activeSongSlug = null,
  heading = "Chants publiés",
  headingId = "catalog-title",
  emptyMessage = "Aucun chant ne correspond à cette recherche.",
  onAddToSetlist,
  onEditSong,
  onOpenSong,
  searchInputId = "song-search",
  searchLabel = "Recherche",
  searchPlaceholder = "Titre ou numéro de recueil",
  showOpenIndicator = true,
  syncUrl = true,
}: SongCatalogProps) {
  const {
    availableCollections,
    catalog,
    isFetching,
    isLoadingMore,
    loadMore,
    search,
    selectedCollections,
    toggleCollection,
    updateSearch,
  } = useSongCatalogQuery({
    initialCatalog,
    initialCollections,
    initialSearch,
    syncUrl,
  });
  const pageSize = catalog.limit;
  const loadedCount = catalog.songs.length;

  return (
    <>
      <div className="catalog-section__heading">
        <div>
          <h2 id={headingId}>{heading}</h2>
        </div>
        <div className="catalog-section__heading-actions">
          {isFetching ? <span aria-live="polite">Mise à jour...</span> : null}
          <span>
            {catalog.total} {catalog.total > 1 ? "chants" : "chant"}
          </span>
        </div>
      </div>

      <form
        className="catalog-search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor={searchInputId}>{searchLabel}</label>
        <div className="catalog-search__row">
          <input
            id={searchInputId}
            name="q"
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={searchPlaceholder}
            value={search}
          />
          {search ? (
            <button type="button" onClick={() => updateSearch("")}>
              Effacer
            </button>
          ) : null}
        </div>
        <fieldset className="catalog-collections">
          <legend>Recueils</legend>
          <div className="catalog-collections__options">
            {availableCollections.map((collection) => (
              <label key={collection}>
                <input
                  checked={selectedCollections.includes(collection)}
                  onChange={() => toggleCollection(collection)}
                  type="checkbox"
                />
                <span>{getCollectionLabel(collection)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      {catalog.songs.length > 0 ? (
        <div className="song-list" data-fetching={isFetching ? "true" : "false"}>
          {catalog.songs.map((song, index) => (
            <SongCard
              index={index}
              isActive={activeSongSlug === song.slug}
              key={song.id}
              mode={activeMode}
              onAddToSetlist={onAddToSetlist}
              onEdit={onEditSong}
              onOpen={onOpenSong}
              showOpenIndicator={showOpenIndicator}
              song={song}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      )}

      {catalog.hasMore ? (
        <div className="catalog-pagination">
          <button
            disabled={isLoadingMore || isFetching}
            onClick={() => void loadMore()}
            type="button"
          >
            {isLoadingMore ? "Chargement..." : `Afficher ${pageSize} chants de plus`}
          </button>
          <span>
            {loadedCount} sur {catalog.total}
          </span>
        </div>
      ) : null}
    </>
  );
}
