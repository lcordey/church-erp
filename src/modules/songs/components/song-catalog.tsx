"use client";

import { useState } from "react";

import { getSongCollectionLabel } from "../collections/song-collection";
import type { PublicSongCatalogPage, PublicSongSummary } from "../types/public-song";
import { SongCard } from "./song-card";
import { useSongCatalogQuery } from "./use-song-catalog-query";

type SongCatalogProps = {
  initialCatalog: PublicSongCatalogPage;
  initialCollections?: string[];
  initialSearch?: string;
  initialThemeIds?: string[];
  initialLabelIds?: string[];
  loadOnMount?: boolean;
  activeMode?: "selection" | "edition";
  activeSongSlug?: string | null;
  heading?: string;
  headingId?: string;
  emptyMessage?: string;
  getSongHref?: (song: PublicSongSummary) => string;
  onAddToSetlist?: (song: PublicSongSummary) => void;
  onEditSong?: (song: PublicSongSummary) => void;
  onOpenSong?: (song: PublicSongSummary) => void;
  searchInputId?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  showHeading?: boolean;
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

function FilterToggleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

export function SongCatalog({
  initialCollections,
  initialCatalog,
  initialSearch = "",
  initialThemeIds = [],
  initialLabelIds = [],
  loadOnMount = false,
  activeMode = "selection",
  activeSongSlug = null,
  heading = "Chants publiés",
  headingId = "catalog-title",
  emptyMessage = "Aucun chant ne correspond à cette recherche.",
  getSongHref,
  onAddToSetlist,
  onEditSong,
  onOpenSong,
  searchInputId = "song-search",
  searchLabel = "Recherche",
  searchPlaceholder = "Titre ou numéro de recueil",
  showHeading = true,
  syncUrl = true,
}: SongCatalogProps) {
  const {
    availableCollections,
    availableThemes,
    availableLabels,
    catalog,
    errorMessage,
    isFetching,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    retry,
    search,
    selectedCollections,
    selectedThemeIds,
    selectedLabelIds,
    toggleCollection,
    toggleTaxonomy,
    updateSearch,
  } = useSongCatalogQuery({
    initialCatalog,
    initialCollections,
    initialSearch,
    initialThemeIds,
    initialLabelIds,
    loadOnMount,
    syncUrl,
  });
  const [openFilter, setOpenFilter] = useState<
    "collections" | "themes" | "labels" | null
  >(null);
  const [areFiltersVisible, setAreFiltersVisible] = useState(true);
  const pageSize = catalog.limit;
  const loadedCount = catalog.songs.length;
  const isCatalogLoading = isInitialLoading || isFetching;
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
          <div className="catalog-search__actions">
            {search ? (
              <button type="button" onClick={() => updateSearch("")}>
                Effacer
              </button>
            ) : null}
            <button
              aria-expanded={areFiltersVisible}
              aria-pressed={areFiltersVisible}
              aria-label={
                areFiltersVisible
                  ? "Masquer les filtres"
                  : "Afficher les filtres"
              }
              className="icon-button catalog-search__filters-toggle"
              onClick={() => {
                setAreFiltersVisible((current) => {
                  const nextValue = !current;

                  if (!nextValue) {
                    setOpenFilter(null);
                  }

                  return nextValue;
                });
              }}
              type="button"
            >
              <FilterToggleIcon />
              <span className="sr-only">
                {areFiltersVisible ? "Masquer les filtres" : "Afficher les filtres"}
              </span>
            </button>
          </div>
        </div>
        {areFiltersVisible ? (
          <div className="catalog-filters">
            <details
              className="catalog-filter-dropdown"
              open={openFilter === "collections"}
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setOpenFilter((current) =>
                    current === "collections" ? null : "collections",
                  );
                }}
              >
                <span>Recueils</span>
              </summary>
              <fieldset className="catalog-collections">
                <legend className="sr-only">Recueils</legend>
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
            </details>

            <details
              className="catalog-filter-dropdown"
              open={openFilter === "themes"}
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setOpenFilter((current) =>
                    current === "themes" ? null : "themes",
                  );
                }}
              >
                <span>Thèmes</span>
              </summary>
              <fieldset className="catalog-collections">
                <legend className="sr-only">Thèmes</legend>
                <div className="catalog-collections__options">
                  {availableThemes.map((theme) => (
                    <label key={theme.id}>
                      <input
                        checked={selectedThemeIds.includes(theme.id)}
                        onChange={() => toggleTaxonomy("theme", theme.id)}
                        type="checkbox"
                      />
                      <span>{theme.name}</span>
                    </label>
                  ))}
                  {availableThemes.length === 0 ? (
                    <p className="catalog-filter-dropdown__hint">
                      Aucun thème associé aux chants publiés.
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </details>

            <details
              className="catalog-filter-dropdown"
              open={openFilter === "labels"}
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setOpenFilter((current) =>
                    current === "labels" ? null : "labels",
                  );
                }}
              >
                <span>Labels</span>
              </summary>
              <fieldset className="catalog-collections">
                <legend className="sr-only">Labels</legend>
                <div className="catalog-collections__options">
                  {availableLabels.map((label) => (
                    <label key={label.id}>
                      <input
                        checked={selectedLabelIds.includes(label.id)}
                        onChange={() => toggleTaxonomy("label", label.id)}
                        type="checkbox"
                      />
                      <span>{label.name}</span>
                    </label>
                  ))}
                  {availableLabels.length === 0 ? (
                    <p className="catalog-filter-dropdown__hint">
                      Aucun label associé aux chants publiés.
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </details>
          </div>
        ) : null}
      </form>

      {openFilter && areFiltersVisible ? (
        <button
          aria-label="Fermer le filtre"
          className="catalog-filter-backdrop"
          onClick={() => setOpenFilter(null)}
          type="button"
        />
      ) : null}

      {isInitialLoading && catalog.songs.length === 0 ? (
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
          {catalog.songs.map((song) => (
            <SongCard
              href={getSongHref?.(song)}
              isActive={activeSongSlug === song.slug}
              key={song.id}
              mode={activeMode}
              onAddToSetlist={onAddToSetlist}
              onEdit={onEditSong}
              onOpen={onOpenSong}
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
