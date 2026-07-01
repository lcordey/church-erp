"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  defaultSongRenderPreferences,
  readSongRenderPreferences,
  songRenderPreferenceChangeEvent,
  songRenderPreferenceStorageKey,
  type SongSourceView,
  type SongRenderPreferences,
} from "./song-render-preferences";
import { useState } from "react";

type SongRenderPreferencesContextValue = {
  currentSourceView: SongSourceView | null;
  preferences: SongRenderPreferences;
  setCurrentSourceView: (next: SongSourceView) => void;
  resetPreferences: () => void;
  setPreferences: (next: Partial<SongRenderPreferences>) => void;
};

const SongRenderPreferencesContext =
  createContext<SongRenderPreferencesContextValue>({
    currentSourceView: null,
    preferences: defaultSongRenderPreferences,
    setCurrentSourceView: () => undefined,
    resetPreferences: () => undefined,
    setPreferences: () => undefined,
  });

let cachedPreferences = defaultSongRenderPreferences;
let cachedStorageValue: string | null | undefined;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(songRenderPreferenceChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(songRenderPreferenceChangeEvent, callback);
  };
}

export function getSongRenderPreferencesSnapshot(): SongRenderPreferences {
  let storageValue: string | null;

  try {
    storageValue = window.localStorage.getItem(songRenderPreferenceStorageKey);
  } catch {
    return cachedPreferences;
  }

  if (storageValue === cachedStorageValue) {
    return cachedPreferences;
  }

  cachedStorageValue = storageValue;
  cachedPreferences = readSongRenderPreferences(storageValue);

  return cachedPreferences;
}

function getServerSnapshot(): SongRenderPreferences {
  return defaultSongRenderPreferences;
}

export function SongRenderPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [currentSourceView, setCurrentSourceView] = useState<SongSourceView | null>(
    null,
  );
  const preferences = useSyncExternalStore(
    subscribe,
    getSongRenderPreferencesSnapshot,
    getServerSnapshot,
  );

  function commit(next: SongRenderPreferences) {
    cachedPreferences = next;
    const storageValue = JSON.stringify(next);

    try {
      window.localStorage.setItem(
        songRenderPreferenceStorageKey,
        storageValue,
      );
      cachedStorageValue = storageValue;
    } catch {}

    window.dispatchEvent(new Event(songRenderPreferenceChangeEvent));
  }

  function setPreferences(next: Partial<SongRenderPreferences>) {
    commit({ ...preferences, ...next });
  }

  function resetPreferences() {
    commit(defaultSongRenderPreferences);
  }

  return (
    <SongRenderPreferencesContext.Provider
      value={{
        currentSourceView,
        preferences,
        resetPreferences,
        setCurrentSourceView,
        setPreferences,
      }}
    >
      {children}
    </SongRenderPreferencesContext.Provider>
  );
}

export function useSongRenderPreferences() {
  return useContext(SongRenderPreferencesContext);
}
