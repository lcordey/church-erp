"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type HeaderMode = "public" | "admin";

export type AppHeaderConfig = {
  mode?: HeaderMode;
  backHref?: string;
  backLabel?: string;
  backIconOnly?: boolean;
  actions?: ReactNode;
};

type AppHeaderContextValue = {
  header: AppHeaderConfig | null;
  setHeader: (config: AppHeaderConfig | null) => void;
};

const AppHeaderContext = createContext<AppHeaderContextValue | null>(null);

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function currentSection(pathname: string) {
  if (
    pathname === "/worship" ||
    pathname.startsWith("/chants/") ||
    pathname.startsWith("/admin/chants")
  ) {
    return "Répertoire";
  }

  if (pathname === "/setlist" || pathname.startsWith("/setlist/")) {
    return "Setlists";
  }

  if (pathname === "/settings") {
    return "Réglages";
  }

  if (pathname === "/profile") {
    return "Profil";
  }

  return "ChurchERP";
}

function currentSectionHref(pathname: string) {
  if (
    pathname === "/worship" ||
    pathname.startsWith("/chants/") ||
    pathname.startsWith("/admin/chants")
  ) {
    return "/worship";
  }

  if (pathname === "/setlist" || pathname.startsWith("/setlist/")) {
    return "/setlist";
  }

  if (pathname === "/settings") {
    return "/settings";
  }

  if (pathname === "/profile") {
    return "/profile";
  }

  return "/worship";
}

function defaultHeader(): AppHeaderConfig {
  return {
    backHref: undefined,
    backLabel: undefined,
    backIconOnly: false,
    mode: "public",
    actions: null,
  };
}

export function AppHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<AppHeaderConfig | null>(null);

  return (
    <AppHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </AppHeaderContext.Provider>
  );
}

export function useAppHeader(config: AppHeaderConfig) {
  const context = useContext(AppHeaderContext);

  if (!context) {
    throw new Error("useAppHeader must be used inside AppHeaderProvider.");
  }

  useEffect(() => {
    context.setHeader(config);

    return () => {
      context.setHeader(null);
    };
  }, [config, context]);
}

export function AppShellHeader({
  isMenuOpen,
  onToggleMenu,
}: {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const context = useContext(AppHeaderContext);
  const pathname = usePathname();

  if (!context) {
    throw new Error("AppShellHeader must be used inside AppHeaderProvider.");
  }

  const resolvedHeader = useMemo(
    () => ({ ...defaultHeader(), ...context.header }),
    [context.header],
  );

  return (
    <header className="app-shell__header">
      <div className="app-shell__header-inner">
        <div className="app-top-bar__identity">
          <button
            aria-controls="app-navigation"
            aria-expanded={isMenuOpen}
            className="app-shell__menu-button"
            onClick={onToggleMenu}
            type="button"
          >
            <MenuIcon />
            <span className="sr-only">{isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
          </button>

          {resolvedHeader.backHref && resolvedHeader.backLabel ? (
            <Link
              aria-label={resolvedHeader.backLabel}
              className={`app-top-bar__back${
                resolvedHeader.backIconOnly ? " app-top-bar__back--icon-only" : ""
              }`}
              href={resolvedHeader.backHref}
              title={resolvedHeader.backLabel}
            >
              <ArrowLeftIcon />
              {resolvedHeader.backIconOnly ? (
                <span className="sr-only">{resolvedHeader.backLabel}</span>
              ) : (
                resolvedHeader.backLabel
              )}
            </Link>
          ) : (
            <Link
              className="app-top-bar__title"
              href={currentSectionHref(pathname)}
            >
              {currentSection(pathname)}
            </Link>
          )}
        </div>

        <div className="app-top-bar__actions">{resolvedHeader.actions}</div>
      </div>
    </header>
  );
}
