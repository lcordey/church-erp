"use client";

import { getSongCollectionLabel } from "../collections/song-collection";
import type { PublicSongCatalogPage, PublicSongSummary } from "../types/public-song";
import { SongCard } from "./song-card";
import { useSongCatalogQuery } from "./use-song-catalog-query";

type SongCatalogProps = {
  initialCatalog: PublicSongCatalogPage;
  initialCollections?: string[];
  initialSearch?: string;
  loadOnMount?: boolean;
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
  showHeading?: boolean;
  showOpenIndicator?: boolean;
  syncUrl?: boolean;
};

function getCollectionLabel(collection: string): string {
  return getSongCollectionLabel(collection);
}

function CatalogLoadingState() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="catalog-loading"
      role="status"
    >
      <span aria-hidden="true" className="catalog-loading__spinner" />
      <div>
        <strong>Chargement du répertoire…</strong>
        <p>Les chants vont apparaître dans un instant.</p>
      </div>
    </div>
  );
}

export function SongCatalog({
  initialCollections,
  initialCatalog,
  initialSearch = "",
  loadOnMount = false,
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
  showHeading = true,
  showOpenIndicator = true,
  syncUrl = true,
}: SongCatalogProps) {
  const {
    availableCollections,
    catalog,
    errorMessage,
    isFetching,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    retry,
    search,
    selectedCollections,
    toggleCollection,
    updateSearch,
  } = useSongCatalogQuery({
    initialCatalog,
    initialCollections,
    initialSearch,
    loadOnMount,
    syncUrl,
  });
  const pageSize = catalog.limit;
  const loadedCount = catalog.songs.length;
  const isCatalogLoading = isInitialLoading || isFetching || isLoadingMore;

  return (
    <>
      {showHeading ? (
        <div className="catalog-section__heading">
          <div>
            <h2 id={headingId}>{heading}</h2>
          </div>
          <div className="catalog-section__heading-actions">
            {isCatalogLoading && !isInitialLoading ? (
              <span aria-live="polite">Mise à jour…</span>
            ) : null}
            {!isCatalogLoading ? (
              <span>
                {catalog.total} {catalog.total > 1 ? "chants" : "chant"}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

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

      {isCatalogLoading ? (
        <CatalogLoadingState />
      ) : errorMessage && catalog.songs.length === 0 ? (
        <div className="catalog-error" role="alert">
          <p>{errorMessage}</p>
          <button onClick={retry} type="button">
            Réessayer
          </button>
        </div>
      ) : catalog.songs.length > 0 ? (
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

      {errorMessage && catalog.songs.length > 0 && !isCatalogLoading ? (
        <div className="catalog-error catalog-error--inline" role="alert">
          <p>{errorMessage}</p>
          <button onClick={retry} type="button">
            Réessayer
          </button>
        </div>
      ) : null}

      {catalog.hasMore ? (
        <div className="catalog-pagination">
          <button
            disabled={isCatalogLoading}
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
