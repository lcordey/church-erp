"use client";

import {
  appThemeOptions,
  type AppTheme,
  useAppTheme,
} from "./app-theme-provider";

const themeLabels: Record<AppTheme, string> = {
  sand: "Sable",
  night: "Nuit",
  forest: "Forêt",
  dawn: "Aube",
};

export function AppThemeToggle() {
  const { theme, setTheme } = useAppTheme();

  return (
    <nav className="theme-toggle" aria-label="Thème de l’application">
      {appThemeOptions.map((option) => (
        <button
          aria-pressed={theme === option}
          className={`theme-toggle__option theme-toggle__option--${option}`}
          key={option}
          onClick={() => setTheme(option)}
          type="button"
        >
          <span className="theme-toggle__swatch" aria-hidden="true" />
          <span>{themeLabels[option]}</span>
        </button>
      ))}
    </nav>
  );
}
