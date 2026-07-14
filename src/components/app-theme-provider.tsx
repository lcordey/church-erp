"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const appThemeStorageKey = "church-erp-app-theme";
export const appThemeChangeEvent = "church-erp-app-theme-change";

export const appThemeOptions = [
  "sand",
  "night",
  "forest",
  "dawn",
] as const;

export type AppTheme = (typeof appThemeOptions)[number];

export const appThemeColors: Record<AppTheme, string> = {
  sand: "#315b78",
  night: "#0f141c",
  forest: "#486953",
  dawn: "#a05d6d",
};

type AppThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const AppThemeContext = createContext<AppThemeContextValue>({
  theme: "sand",
  setTheme: () => undefined,
});

let cachedTheme: AppTheme = "sand";

function normalizeTheme(value: string | null): AppTheme {
  return appThemeOptions.includes(value as AppTheme)
    ? (value as AppTheme)
    : "sand";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(appThemeChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(appThemeChangeEvent, callback);
  };
}

function getSnapshot(): AppTheme {
  try {
    cachedTheme = normalizeTheme(
      window.localStorage.getItem(appThemeStorageKey),
    );
  } catch {
    return cachedTheme;
  }

  return cachedTheme;
}

function getServerSnapshot(): AppTheme {
  return "sand";
}

function applyThemeColor(theme: AppTheme) {
  const color = appThemeColors[theme];

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((themeColor) => {
      if (themeColor.content !== color) {
        themeColor.setAttribute("content", color);
      }
    });
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.appTheme = theme;
  document.documentElement.style.colorScheme =
    theme === "night" ? "dark" : "light";
  applyThemeColor(theme);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(theme);

    const observer = new MutationObserver(() => applyThemeColor(theme));
    observer.observe(document.head, {
      attributes: true,
      attributeFilter: ["content"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [theme]);

  function setTheme(nextTheme: AppTheme) {
    cachedTheme = nextTheme;

    try {
      window.localStorage.setItem(appThemeStorageKey, nextTheme);
    } catch {}

    applyTheme(nextTheme);
    window.dispatchEvent(new Event(appThemeChangeEvent));
  }

  return (
    <AppThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
