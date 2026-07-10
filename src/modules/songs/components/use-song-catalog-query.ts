"use client";

import { useEffect, useRef, useState } from "react";

import type {
  PublicSongCatalogPage,
  PublicSongCatalogResults,
} from "../types/public-song";

type QueryChangeReason = "filter" | "search";

type UseSongCatalogQueryOptions = {
  initialCatalog: PublicSongCatalogPage;
  initialCollections?: string[];
  initialSearch?: string;
  initialThemeIds?: string[];
  initialLabelIds?: string[];
  loadOnMount?: boolean;
  syncUrl?: boolean;
};

type CatalogCache = Map<string, PublicSongCatalogResults>;

// Keep inactive filters referentially stable so they do not retrigger effects.
const noEffectiveFilterValues: string[] = [];

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

export function normalizeSelectedFilterValues(
  selectedValues: string[],
  availableValues: string[],
): string[] {
  if (
    selectedValues.length === 0 ||
    (availableValues.length > 0 &&
      selectedValues.length === availableValues.length)
  ) {
    return noEffectiveFilterValues;
  }

  return selectedValues;
}

export function createSongCatalogQueryKey(options: {
  collections: string[];
  themeIds: string[];
  labelIds: string[];
  limit: number;
  offset: number;
  search: string;
}): string {
  return JSON.stringify({
    search: options.search.trim(),
    collections: normalizeCollections(options.collections),
    themeIds: normalizeCollections(options.themeIds),
    labelIds: normalizeCollections(options.labelIds),
    limit: options.limit,
    offset: options.offset,
  });
}

function mergeSongs<
  TSong extends {
    id: string;
  },
>(currentSongs: TSong[], nextSongs: TSong[]) {
  const songsById = new Map(currentSongs.map((song) => [song.id, song]));

  for (const song of nextSongs) {
    if (!songsById.has(song.id)) {
      songsById.set(song.id, song);
    }
  }

  return [...songsById.values()];
}

async function fetchCatalog(options: {
  collections: string[];
  themeIds: string[];
  labelIds: string[];
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

  if (options.themeIds.length > 0) {
    url.searchParams.set("themes", options.themeIds.join(","));
  }

  if (options.labelIds.length > 0) {
    url.searchParams.set("labels", options.labelIds.join(","));
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
  initialThemeIds = [],
  initialLabelIds = [],
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
  const initialKey = createSongCatalogQueryKey({
    collections: initialSelectedCollections,
    themeIds: initialThemeIds,
    labelIds: initialLabelIds,
    limit: pageSize,
    offset: 0,
    search: initialSearch,
  });
  const [catalog, setCatalog] = useState(initialCatalog);
  const [availableCollections, setAvailableCollections] = useState(
    initialCatalog.collections,
  );
  const [availableThemes, setAvailableThemes] = useState(initialCatalog.themes);
  const [availableLabels, setAvailableLabels] = useState(initialCatalog.labels);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    () => initialSelectedCollections,
  );
  const [selectedThemeIds, setSelectedThemeIds] = useState(initialThemeIds);
  const [selectedLabelIds, setSelectedLabelIds] = useState(initialLabelIds);
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
  const availableThemesRef = useRef(initialCatalog.themes);
  const availableLabelsRef = useRef(initialCatalog.labels);
  const replacementRequestId = useRef(0);
  const replacementController = useRef<AbortController | null>(null);
  const activeQueryKey = useRef(initialKey);
  const changeReason = useRef<QueryChangeReason>("search");
  const effectiveSelectedCollections = normalizeSelectedFilterValues(
    selectedCollections,
    availableCollections,
  );
  const effectiveSelectedThemeIds = normalizeSelectedFilterValues(
    selectedThemeIds,
    availableThemes.map((theme) => theme.id),
  );
  const effectiveSelectedLabelIds = normalizeSelectedFilterValues(
    selectedLabelIds,
    availableLabels.map((label) => label.id),
  );
  const currentQueryKey = createSongCatalogQueryKey({
    collections: effectiveSelectedCollections,
    themeIds: effectiveSelectedThemeIds,
    labelIds: effectiveSelectedLabelIds,
    limit: pageSize,
    offset: 0,
    search,
  });
  const [catalogQueryKey, setCatalogQueryKey] = useState(initialKey);
  const hasStaleCatalog = catalogQueryKey !== currentQueryKey;

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

    if (effectiveSelectedCollections.length > 0) {
      url.searchParams.set("collections", effectiveSelectedCollections.join(","));
    } else {
      url.searchParams.delete("collections");
    }

    if (effectiveSelectedThemeIds.length > 0) {
      url.searchParams.set("themes", effectiveSelectedThemeIds.join(","));
    } else {
      url.searchParams.delete("themes");
    }

    if (effectiveSelectedLabelIds.length > 0) {
      url.searchParams.set("labels", effectiveSelectedLabelIds.join(","));
    } else {
      url.searchParams.delete("labels");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [
    search,
    effectiveSelectedCollections,
    effectiveSelectedThemeIds,
    effectiveSelectedLabelIds,
    syncUrl,
  ]);

  useEffect(() => {
    const isFirstRun = !hasMounted.current;

    if (isFirstRun) {
      hasMounted.current = true;

      if (!loadOnMount) {
        return;
      }
    }

    const normalizedSearch = search.trim();
    const key = createSongCatalogQueryKey({
      collections: effectiveSelectedCollections,
      themeIds: effectiveSelectedThemeIds,
      labelIds: effectiveSelectedLabelIds,
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
        collections: effectiveSelectedCollections,
        themeIds: effectiveSelectedThemeIds,
        labelIds: effectiveSelectedLabelIds,
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
          const nextThemes = hasCollections(nextCatalogResponse)
            ? nextCatalogResponse.themes
            : availableThemesRef.current;
          const nextLabels = hasCollections(nextCatalogResponse)
            ? nextCatalogResponse.labels
            : availableLabelsRef.current;
          const nextCatalog = toCatalogResults(nextCatalogResponse);

          if (hasCollections(nextCatalogResponse)) {
            hasLoadedCollections.current = true;
            availableCollectionsRef.current = nextCollections;
            setAvailableCollections(nextCollections);
            availableThemesRef.current = nextThemes;
            availableLabelsRef.current = nextLabels;
            setAvailableThemes(nextThemes);
            setAvailableLabels(nextLabels);
          }

          hasLoadedCatalog.current = true;
          cache.set(key, nextCatalog);
          setCatalogQueryKey(key);
          setCatalog({
            ...nextCatalog,
            collections: nextCollections,
            themes: nextThemes,
            labels: nextLabels,
          });
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
    effectiveSelectedCollections,
    effectiveSelectedThemeIds,
    effectiveSelectedLabelIds,
  ]);

  function applyCachedCatalog(
    nextSearch: string,
    nextCollections: string[],
    nextThemeIds: string[],
    nextLabelIds: string[],
  ) {
    const cachedKey = createSongCatalogQueryKey({
      collections: normalizeSelectedFilterValues(
        nextCollections,
        availableCollectionsRef.current,
      ),
      themeIds: normalizeSelectedFilterValues(
        nextThemeIds,
        availableThemesRef.current.map((theme) => theme.id),
      ),
      labelIds: normalizeSelectedFilterValues(
        nextLabelIds,
        availableLabelsRef.current.map((label) => label.id),
      ),
      limit: pageSize,
      offset: 0,
      search: nextSearch,
    });
    const cached = cache.get(cachedKey);

    if (cached) {
      setCatalogQueryKey(cachedKey);
      setCatalog({
        ...cached,
        collections: availableCollectionsRef.current,
        themes: availableThemesRef.current,
        labels: availableLabelsRef.current,
      });
    }
  }

  function updateSearch(value: string) {
    changeReason.current = "search";
    applyCachedCatalog(
      value,
      selectedCollections,
      selectedThemeIds,
      selectedLabelIds,
    );
    setSearch(value);
  }

  function toggleCollection(collection: string) {
    changeReason.current = "filter";
    const nextCollections = selectedCollections.includes(collection)
      ? selectedCollections.filter((item) => item !== collection)
      : [...selectedCollections, collection];

    applyCachedCatalog(
      search,
      nextCollections,
      selectedThemeIds,
      selectedLabelIds,
    );
    setSelectedCollections(nextCollections);
  }

  function toggleTaxonomy(kind: "theme" | "label", id: string) {
    changeReason.current = "filter";

    if (kind === "theme") {
      const nextIds = selectedThemeIds.includes(id)
        ? selectedThemeIds.filter((currentId) => currentId !== id)
        : [...selectedThemeIds, id];

      applyCachedCatalog(
        search,
        selectedCollections,
        nextIds,
        selectedLabelIds,
      );
      setSelectedThemeIds(nextIds);
      return;
    }

    const nextIds = selectedLabelIds.includes(id)
      ? selectedLabelIds.filter((currentId) => currentId !== id)
      : [...selectedLabelIds, id];

    applyCachedCatalog(
      search,
      selectedCollections,
      selectedThemeIds,
      nextIds,
    );
    setSelectedLabelIds(nextIds);
  }

  async function loadMore() {
    if (isLoadingMore || isFetching) {
      return;
    }

    const offset = catalog.songs.length;
    const normalizedSearch = search.trim();
    const baseKey = createSongCatalogQueryKey({
      collections: effectiveSelectedCollections,
      themeIds: effectiveSelectedThemeIds,
      labelIds: effectiveSelectedLabelIds,
      limit: pageSize,
      offset: 0,
      search: normalizedSearch,
    });
    const key = createSongCatalogQueryKey({
      collections: effectiveSelectedCollections,
      themeIds: effectiveSelectedThemeIds,
      labelIds: effectiveSelectedLabelIds,
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
          collections: effectiveSelectedCollections,
          themeIds: effectiveSelectedThemeIds,
          labelIds: effectiveSelectedLabelIds,
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
        themes: availableThemesRef.current,
        labels: availableLabelsRef.current,
        songs: mergeSongs(current.songs, nextResults.songs),
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
    changeReason.current = "filter";
    setRefreshVersion((current) => current + 1);
  }

  return {
    availableCollections,
    availableThemes,
    availableLabels,
    catalog,
    errorMessage,
    hasStaleCatalog,
    isFetching,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    search,
    selectedCollections,
    selectedThemeIds,
    selectedLabelIds,
    retry,
    toggleCollection,
    toggleTaxonomy,
    updateSearch,
  };
}
