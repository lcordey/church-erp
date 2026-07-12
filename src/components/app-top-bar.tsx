"use client";

import { useMemo, type ReactNode } from "react";

import { useAppHeader } from "./app-header-context";
import { ViewModeToggle } from "./view-mode-toggle";

type AppTopBarProps = {
  mode: "public" | "admin";
  activeViewMode?: "selection" | "edition";
  backHref?: string;
  backLabel?: string;
  backIconOnly?: boolean;
  actions?: ReactNode;
  onViewModeChange?: (mode: "selection" | "edition") => void;
  pendingViewMode?: "selection" | "edition" | null;
  showViewModeToggle?: boolean;
};

export function AppTopBar({
  mode,
  activeViewMode,
  backHref,
  backLabel,
  backIconOnly,
  actions,
  onViewModeChange,
  pendingViewMode = null,
  showViewModeToggle = Boolean(onViewModeChange),
}: AppTopBarProps) {
  const headerActions = useMemo(
    () => (
      <>
        {actions}
        {showViewModeToggle ? (
          <ViewModeToggle
            activeMode={activeViewMode}
            mode={mode}
            onModeChange={onViewModeChange}
            pendingMode={pendingViewMode}
          />
        ) : null}
      </>
    ),
    [actions, activeViewMode, mode, onViewModeChange, pendingViewMode, showViewModeToggle],
  );

  const headerConfig = useMemo(
    () => ({
      mode,
      backHref,
      backLabel,
      backIconOnly,
      actions: headerActions,
    }),
    [backHref, backIconOnly, backLabel, headerActions, mode],
  );

  useAppHeader(headerConfig);

  return null;
}
