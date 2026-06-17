"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ViewModeToggle } from "./view-mode-toggle";

type AppTopBarProps = {
  mode: "public" | "admin";
  activeViewMode?: "selection" | "edition";
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  onViewModeChange?: (mode: "selection" | "edition") => void;
  showViewModeToggle?: boolean;
};

export function AppTopBar({
  mode,
  activeViewMode,
  backHref,
  backLabel,
  actions,
  onViewModeChange,
  showViewModeToggle = Boolean(onViewModeChange),
}: AppTopBarProps) {
  return (
    <header className="app-top-bar">
      <div className="app-top-bar__identity">
        {backHref && backLabel ? (
          <Link className="app-top-bar__back" href={backHref}>
            <span aria-hidden="true">←</span>
            {backLabel}
          </Link>
        ) : (
          <>
            <div className="site-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <Link className="app-top-bar__brand" href="/">
              Répertoire de louange
            </Link>
          </>
        )}
      </div>
      <div className="app-top-bar__actions">
        {actions}
        {showViewModeToggle ? (
          <ViewModeToggle
            activeMode={activeViewMode}
            mode={mode}
            onModeChange={onViewModeChange}
          />
        ) : null}
      </div>
    </header>
  );
}
