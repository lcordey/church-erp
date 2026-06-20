"use client";

import { useEffect, useRef, useState } from "react";

import type {
  PublicSongCatalogPage,
  PublicSongCatalogResults,
} from "../types/public-song";

type QueryChangeReason = "collection" | "search";

type UseSongCatalogQueryOptions = {
  initialCatalog: PublicSongCatalogPage;
  initialCollections?: string[];
  initialSearch?: string;
  syncUrl?: boolean;
};

type CatalogCache = Map<string, PublicSongCatalogResults>;

function toCatalogResults(
  catalog: PublicSongCatalogPage | PublicSongCatalogResults,
): PublicSongCatalogResults {
  return {
    songs: catalog.songs,
    total: catalog.total,
    limit: catalog.limit,
    offset: catalog.offset,
    hasMore: catalog.hasMore,
  };
}

function normalizeCollections(collections: string[]): string[] {
  return [...collections].sort((left, right) => left.localeCompare(right));
}

function createQueryKey(options: {
  collections: string[];
  limit: number;
  offset: number;
  search: string;
}): string {
  return JSON.stringify({
    search: options.search.trim(),
    collections: normalizeCollections(options.collections),
    limit: options.limit,
    offset: options.offset,
  });
}

async function fetchCatalogResults(options: {
  collections: string[];
  limit: number;
  offset: number;
  search: string;
  signal?: AbortSignal;
}): Promise<PublicSongCatalogResults> {
  const url = new URL("/api/songs", window.location.origin);
  const search = options.search.trim();

  if (search) {
    url.searchParams.set("q", search);
  }

  if (options.collections.length > 0) {
    url.searchParams.set("collections", options.collections.join(","));
  }

  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("offset", String(options.offset));

  const response = await fetch(url, { signal: options.signal });
  const payload = (await response.json().catch(() => null)) as
    | { data?: PublicSongCatalogResults; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.data) {
    throw new Error(
      payload?.error?.message ?? "Impossible de charger les chants.",
    );
  }

  return payload.data;
}

export function useSongCatalogQuery({
  initialCatalog,
  initialCollections,
  initialSearch = "",
  syncUrl = true,
}: UseSongCatalogQueryOptions) {
  const availableCollections = initialCatalog.collections;
  const pageSize = initialCatalog.limit;
  const initialSelectedCollections =
    initialCollections?.length
      ? initialCollections.filter((collection) =>
          availableCollections.includes(collection),
        )
      : [];
  const initialKey = createQueryKey({
    collections: initialSelectedCollections,
    limit: pageSize,
    offset: 0,
    search: initialSearch,
  });
  const [catalog, setCatalog] = useState(initialCatalog);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    () => initialSelectedCollections,
  );
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cache] = useState<CatalogCache>(
    () => new Map([[initialKey, toCatalogResults(initialCatalog)]]),
  );
  const hasMounted = useRef(false);
  const replacementRequestId = useRef(0);
  const replacementController = useRef<AbortController | null>(null);
  const activeQueryKey = useRef(initialKey);
  const changeReason = useRef<QueryChangeReason>("search");

  useEffect(() => {
    if (!syncUrl) {
      return;
    }

    const url = new URL(window.location.href);
    const normalizedSearch = search.trim();

    if (normalizedSearch) {
      url.searchParams.set("q", normalizedSearch);
    } else {
      url.searchParams.delete("q");
    }

    if (selectedCollections.length > 0) {
      url.searchParams.set("collections", selectedCollections.join(","));
    } else {
      url.searchParams.delete("collections");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [search, selectedCollections, syncUrl]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const normalizedSearch = search.trim();
    const key = createQueryKey({
      collections: selectedCollections,
      limit: pageSize,
      offset: 0,
      search: normalizedSearch,
    });
    activeQueryKey.current = key;

    replacementController.current?.abort();
    const controller = new AbortController();
    replacementController.current = controller;
    const requestId = replacementRequestId.current + 1;
    replacementRequestId.current = requestId;
    const delay = changeReason.current === "search" ? 200 : 0;
    setIsFetching(true);
    setErrorMessage("");

    const timer = window.setTimeout(() => {
      void fetchCatalogResults({
        collections: selectedCollections,
        limit: pageSize,
        offset: 0,
        search: normalizedSearch,
        signal: controller.signal,
      })
        .then((nextCatalog) => {
          if (
            controller.signal.aborted ||
            replacementRequestId.current !== requestId
          ) {
            return;
          }

          cache.set(key, nextCatalog);
          setCatalog({ ...nextCatalog, collections: availableCollections });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          if (
            !controller.signal.aborted &&
            replacementRequestId.current === requestId
          ) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Impossible de charger les chants.",
            );
          }
        })
        .finally(() => {
          if (
            !controller.signal.aborted &&
            replacementRequestId.current === requestId
          ) {
            setIsFetching(false);
          }
        });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [availableCollections, cache, pageSize, search, selectedCollections]);

  function applyCachedCatalog(nextSearch: string, nextCollections: string[]) {
    const cached = cache.get(
      createQueryKey({
        collections: nextCollections,
        limit: pageSize,
        offset: 0,
        search: nextSearch,
      }),
    );

    if (cached) {
      setCatalog({ ...cached, collections: availableCollections });
    }
  }

  function updateSearch(value: string) {
    changeReason.current = "search";
    applyCachedCatalog(value, selectedCollections);
    setSearch(value);
  }

  function toggleCollection(collection: string) {
    changeReason.current = "collection";
    const nextCollections = selectedCollections.includes(collection)
      ? selectedCollections.filter((item) => item !== collection)
      : [...selectedCollections, collection];

    applyCachedCatalog(search, nextCollections);
    setSelectedCollections(nextCollections);
  }

  async function loadMore() {
    if (isLoadingMore || isFetching) {
      return;
    }

    const offset = catalog.songs.length;
    const normalizedSearch = search.trim();
    const baseKey = createQueryKey({
      collections: selectedCollections,
      limit: pageSize,
      offset: 0,
      search: normalizedSearch,
    });
    const key = createQueryKey({
      collections: selectedCollections,
      limit: pageSize,
      offset,
      search: normalizedSearch,
    });
    const cached = cache.get(key);

    setIsLoadingMore(true);
    setErrorMessage("");

    try {
      const nextCatalog =
        cached ??
        (await fetchCatalogResults({
          collections: selectedCollections,
          limit: pageSize,
          offset,
          search: normalizedSearch,
        }));

      if (activeQueryKey.current !== baseKey) {
        return;
      }

      cache.set(key, nextCatalog);
      setCatalog((current) => ({
        ...nextCatalog,
        collections: availableCollections,
        songs: [...current.songs, ...nextCatalog.songs],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les chants.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  return {
    availableCollections,
    catalog,
    errorMessage,
    isFetching,
    isLoadingMore,
    loadMore,
    search,
    selectedCollections,
    toggleCollection,
    updateSearch,
  };
}
