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

function defaultHeader(pathname: string): AppHeaderConfig {
  return {
    backHref: undefined,
    backLabel: undefined,
    mode: "public",
    actions: (
      <Link className="app-top-bar__brand" href="/worship">
        {currentSection(pathname)}
      </Link>
    ),
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
    () => ({ ...defaultHeader(pathname), ...context.header }),
    [context.header, pathname],
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
            <Link className="app-top-bar__back" href={resolvedHeader.backHref}>
              <span aria-hidden="true">←</span>
              {resolvedHeader.backLabel}
            </Link>
          ) : (
            <>
              <div className="site-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <Link className="app-top-bar__brand" href="/worship">
                ChurchERP
              </Link>
            </>
          )}
        </div>

        <div className="app-top-bar__actions">{resolvedHeader.actions}</div>
      </div>
    </header>
  );
}
