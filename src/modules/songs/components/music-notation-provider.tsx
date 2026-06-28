"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { MusicNotation } from "../music/musical-key";

type MusicNotationContextValue = {
  notation: MusicNotation;
  setNotation: (notation: MusicNotation) => void;
};

const MusicNotationContext = createContext<MusicNotationContextValue>({
  notation: "english",
  setNotation: () => undefined,
});

const storageKey = "church-erp-music-notation";
const notationChangeEvent = "church-erp-music-notation-change";
let cachedNotation: MusicNotation = "english";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(notationChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(notationChangeEvent, callback);
  };
}

function getSnapshot(): MusicNotation {
  try {
    const storedNotation = window.localStorage.getItem(storageKey);

    cachedNotation = storedNotation === "french" ? "french" : "english";
  } catch {
    return cachedNotation;
  }

  return cachedNotation;
}

function getServerSnapshot(): MusicNotation {
  return "english";
}

export function MusicNotationProvider({ children }: { children: ReactNode }) {
  const notation = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function setNotation(value: MusicNotation) {
    cachedNotation = value;

    try {
      window.localStorage.setItem(storageKey, value);
    } catch {}

    window.dispatchEvent(new Event(notationChangeEvent));
  }

  return (
    <MusicNotationContext.Provider value={{ notation, setNotation }}>
      {children}
    </MusicNotationContext.Provider>
  );
}

export function useMusicNotation() {
  return useContext(MusicNotationContext);
}
