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
  loadOnMount?: boolean;
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

async function fetchCatalog(options: {
  collections: string[];
  includeCollections?: boolean;
  limit: number;
  offset: number;
  search: string;
  signal?: AbortSignal;
}): Promise<PublicSongCatalogPage | PublicSongCatalogResults> {
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

  if (options.includeCollections) {
    url.searchParams.set("includeCollections", "true");
  }

  const response = await fetch(url, { signal: options.signal });
  const payload = (await response.json().catch(() => null)) as
    | {
        data?: PublicSongCatalogPage | PublicSongCatalogResults;
        error?: { message?: string };
      }
    | null;

  if (!response.ok || !payload?.data) {
    throw new Error(
      payload?.error?.message ?? "Impossible de charger les chants.",
    );
  }

  return payload.data;
}

function hasCollections(
  catalog: PublicSongCatalogPage | PublicSongCatalogResults,
): catalog is PublicSongCatalogPage {
  return "collections" in catalog;
}

export function useSongCatalogQuery({
  initialCatalog,
  initialCollections,
  initialSearch = "",
  loadOnMount = false,
  syncUrl = true,
}: UseSongCatalogQueryOptions) {
  const pageSize = initialCatalog.limit;
  const initialSelectedCollections =
    initialCollections?.length
      ? loadOnMount
        ? initialCollections
        : initialCollections.filter((collection) =>
            initialCatalog.collections.includes(collection),
          )
      : [];
  const initialKey = createQueryKey({
    collections: initialSelectedCollections,
    limit: pageSize,
    offset: 0,
    search: initialSearch,
  });
  const [catalog, setCatalog] = useState(initialCatalog);
  const [availableCollections, setAvailableCollections] = useState(
    initialCatalog.collections,
  );
  const [search, setSearch] = useState(initialSearch);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    () => initialSelectedCollections,
  );
  const [isFetching, setIsFetching] = useState(loadOnMount);
  const [isInitialLoading, setIsInitialLoading] = useState(loadOnMount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [cache] = useState<CatalogCache>(
    () =>
      loadOnMount
        ? new Map()
        : new Map([[initialKey, toCatalogResults(initialCatalog)]]),
  );
  const hasMounted = useRef(false);
  const hasLoadedCatalog = useRef(!loadOnMount);
  const hasLoadedCollections = useRef(!loadOnMount);
  const availableCollectionsRef = useRef(initialCatalog.collections);
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
    const isFirstRun = !hasMounted.current;

    if (isFirstRun) {
      hasMounted.current = true;

      if (!loadOnMount) {
        return;
      }
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
    const delay =
      !isFirstRun && changeReason.current === "search" ? 200 : 0;
    setIsFetching(true);
    setIsInitialLoading(!hasLoadedCatalog.current);
    setErrorMessage("");

    const timer = window.setTimeout(() => {
      const includeCollections = !hasLoadedCollections.current;

      void fetchCatalog({
        collections: selectedCollections,
        includeCollections,
        limit: pageSize,
        offset: 0,
        search: normalizedSearch,
        signal: controller.signal,
      })
        .then((nextCatalogResponse) => {
          if (
            controller.signal.aborted ||
            replacementRequestId.current !== requestId
          ) {
            return;
          }

          const nextCollections = hasCollections(nextCatalogResponse)
            ? nextCatalogResponse.collections
            : availableCollectionsRef.current;
          const nextCatalog = toCatalogResults(nextCatalogResponse);

          if (hasCollections(nextCatalogResponse)) {
            hasLoadedCollections.current = true;
            availableCollectionsRef.current = nextCollections;
            setAvailableCollections(nextCollections);
          }

          hasLoadedCatalog.current = true;
          cache.set(key, nextCatalog);
          setCatalog({ ...nextCatalog, collections: nextCollections });
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
            setIsInitialLoading(false);
          }
        });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    cache,
    loadOnMount,
    pageSize,
    refreshVersion,
    search,
    selectedCollections,
  ]);

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
      setCatalog({
        ...cached,
        collections: availableCollectionsRef.current,
      });
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
        (await fetchCatalog({
          collections: selectedCollections,
          limit: pageSize,
          offset,
          search: normalizedSearch,
        }));

      if (activeQueryKey.current !== baseKey) {
        return;
      }

      const nextResults = toCatalogResults(nextCatalog);

      cache.set(key, nextResults);
      setCatalog((current) => ({
        ...nextResults,
        collections: availableCollectionsRef.current,
        songs: [...current.songs, ...nextResults.songs],
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

  function retry() {
    changeReason.current = "collection";
    setRefreshVersion((current) => current + 1);
  }

  return {
    availableCollections,
    catalog,
    errorMessage,
    isFetching,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    search,
    selectedCollections,
    retry,
    toggleCollection,
    updateSearch,
  };
}
