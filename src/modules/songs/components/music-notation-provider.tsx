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

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(notationChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(notationChangeEvent, callback);
  };
}

function getSnapshot(): MusicNotation {
  const storedNotation = window.localStorage.getItem(storageKey);

  return storedNotation === "french" ? "french" : "english";
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
    window.localStorage.setItem(storageKey, value);
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
