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
  type SongRenderPreferences,
} from "./song-render-preferences";

type SongRenderPreferencesContextValue = {
  preferences: SongRenderPreferences;
  resetPreferences: () => void;
  setPreferences: (next: Partial<SongRenderPreferences>) => void;
};

const SongRenderPreferencesContext =
  createContext<SongRenderPreferencesContextValue>({
    preferences: defaultSongRenderPreferences,
    resetPreferences: () => undefined,
    setPreferences: () => undefined,
  });

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(songRenderPreferenceChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(songRenderPreferenceChangeEvent, callback);
  };
}

function getSnapshot(): SongRenderPreferences {
  return readSongRenderPreferences(
    window.localStorage.getItem(songRenderPreferenceStorageKey),
  );
}

function getServerSnapshot(): SongRenderPreferences {
  return defaultSongRenderPreferences;
}

export function SongRenderPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const preferences = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function commit(next: SongRenderPreferences) {
    window.localStorage.setItem(
      songRenderPreferenceStorageKey,
      JSON.stringify(next),
    );
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
      value={{ preferences, resetPreferences, setPreferences }}
    >
      {children}
    </SongRenderPreferencesContext.Provider>
  );
}

export function useSongRenderPreferences() {
  return useContext(SongRenderPreferencesContext);
}
