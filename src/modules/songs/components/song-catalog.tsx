"use client";

import { useEffect, useRef, useState } from "react";

import { getSongCollectionLabel } from "../collections/song-collection";
import type { PublicSongCatalogPage, PublicSongSummary } from "../types/public-song";
import { SongCard } from "./song-card";

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
  const [catalog, setCatalog] = useState(initialCatalog);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const collections = catalog.collections;
  const [search, setSearch] = useState(initialSearch);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    () =>
      initialCollections?.length
        ? initialCollections.filter((collection) =>
            initialCatalog.collections.includes(collection),
          )
        : [],
  );
  const hasMounted = useRef(false);
  const pageSize = catalog.limit;
  const loadedCount = catalog.songs.length;

  useEffect(() => {
    if (!syncUrl) {
      return;
    }

    const url = new URL(window.location.href);

    if (search.trim()) {
      url.searchParams.set("q", search.trim());
    } else {
      url.searchParams.delete("q");
    }

    if (selectedCollections.length > 0) {
      url.searchParams.set("collections", selectedCollections.join(","));
    } else {
      url.searchParams.delete("collections");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [collections.length, search, selectedCollections, syncUrl]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const url = new URL("/api/songs", window.location.origin);

      if (search.trim()) {
        url.searchParams.set("q", search.trim());
      }

      if (selectedCollections.length > 0) {
        url.searchParams.set("collections", selectedCollections.join(","));
      }

      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", "0");

      void fetch(url, { signal: controller.signal })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as
            | { data?: PublicSongCatalogPage }
            | null;

          if (response.ok && payload?.data) {
            setCatalog(payload.data);
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [pageSize, search, selectedCollections]);

  function updateSearch(value: string) {
    setSearch(value);
  }

  function toggleCollection(collection: string) {
    setSelectedCollections((current) => {
      return current.includes(collection)
        ? current.filter((item) => item !== collection)
        : [...current, collection];
    });
  }

  async function loadMore() {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    const url = new URL("/api/songs", window.location.origin);

    if (search.trim()) {
      url.searchParams.set("q", search.trim());
    }

    if (selectedCollections.length > 0) {
      url.searchParams.set("collections", selectedCollections.join(","));
    }

    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(loadedCount));

    try {
      const response = await fetch(url);
      const payload = (await response.json().catch(() => null)) as
        | { data?: PublicSongCatalogPage }
        | null;

      if (!response.ok || !payload?.data) {
        return;
      }

      const nextCatalog = payload.data;

      setCatalog((current) => ({
        ...nextCatalog,
        songs: [...current.songs, ...nextCatalog.songs],
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <>
      <div className="catalog-section__heading">
        <div>
          <h2 id={headingId}>{heading}</h2>
        </div>
        <div className="catalog-section__heading-actions">
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
            {collections.map((collection) => (
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
        <div className="song-list">
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
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
            type="button"
          >
            {isLoadingMore ? "Chargement..." : "Afficher 20 chants de plus"}
          </button>
          <span>
            {loadedCount} sur {catalog.total}
          </span>
        </div>
      ) : null}
    </>
  );
}
