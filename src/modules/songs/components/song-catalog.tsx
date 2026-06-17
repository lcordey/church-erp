"use client";

import { useEffect, useMemo, useState } from "react";

import type { PublicSongSummary } from "../types/public-song";
import { SongCard } from "./song-card";

type SongCatalogProps = {
  songs: PublicSongSummary[];
  initialCollections?: string[];
  initialSearch?: string;
  activeMode?: "selection" | "edition";
  activeSongSlug?: string | null;
  onEditSong?: (song: PublicSongSummary) => void;
  onOpenSong?: (song: PublicSongSummary) => void;
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatCollectionNumber(song: PublicSongSummary): string {
  if (!song.collectionNumber) {
    return "";
  }

  return String(song.collectionNumber).padStart(3, "0");
}

function matchesSearch(song: PublicSongSummary, search: string): boolean {
  if (!search) {
    return true;
  }

  const collectionNumber = formatCollectionNumber(song);
  const searchableText = normalizeSearch(
    [
      song.title,
      song.collection,
      song.collection && song.collectionNumber
        ? `${song.collection} ${song.collectionNumber}`
        : "",
      collectionNumber,
      song.collectionNumber?.toString() ?? "",
    ].join(" "),
  );

  return searchableText.includes(search);
}

function getCollectionLabel(collection: string): string {
  return collection === "JEM" ? "Jem" : collection;
}

function isCollection(value: string | null): value is string {
  return Boolean(value);
}

export function SongCatalog({
  initialCollections,
  songs,
  initialSearch = "",
  activeMode = "selection",
  activeSongSlug = null,
  onEditSong,
  onOpenSong,
}: SongCatalogProps) {
  const collections = useMemo(
    () =>
      Array.from(new Set(songs.map((song) => song.collection).filter(isCollection))),
    [songs],
  );
  const [search, setSearch] = useState(initialSearch);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    () =>
      initialCollections?.length
        ? initialCollections.filter((collection) =>
            collections.includes(collection),
          )
        : [],
  );
  const normalizedSearch = normalizeSearch(search);
  const filteredSongs = useMemo(
    () =>
      songs.filter(
        (song) =>
          matchesSearch(song, normalizedSearch) &&
          (selectedCollections.length === 0 ||
            Boolean(
              song.collection && selectedCollections.includes(song.collection),
            )),
      ),
    [songs, normalizedSearch, selectedCollections],
  );

  useEffect(() => {
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
  }, [collections.length, search, selectedCollections]);

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

  return (
    <>
      <div className="catalog-section__heading">
        <div>
          <h2 id="catalog-title">Chants publiés</h2>
        </div>
        <div className="catalog-section__heading-actions">
          <span>
            {filteredSongs.length} {filteredSongs.length > 1 ? "chants" : "chant"}
          </span>
        </div>
      </div>

      <form
        className="catalog-search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor="song-search">Recherche</label>
        <div className="catalog-search__row">
          <input
            id="song-search"
            name="q"
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Titre ou numéro JEM"
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

      {filteredSongs.length > 0 ? (
        <div className="song-list">
          {filteredSongs.map((song, index) => (
            <SongCard
              index={index}
              isActive={activeSongSlug === song.slug}
              key={song.id}
              mode={activeMode}
              onEdit={onEditSong}
              onOpen={onOpenSong}
              song={song}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Aucun chant ne correspond à cette recherche.</p>
        </div>
      )}
    </>
  );
}
