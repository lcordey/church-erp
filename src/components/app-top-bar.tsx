"use client";

import { useMemo, type ReactNode } from "react";

import { useAppHeader } from "./app-header-context";
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
  const headerActions = useMemo(
    () => (
      <>
        {actions}
        {showViewModeToggle ? (
          <ViewModeToggle
            activeMode={activeViewMode}
            mode={mode}
            onModeChange={onViewModeChange}
          />
        ) : null}
      </>
    ),
    [actions, activeViewMode, mode, onViewModeChange, showViewModeToggle],
  );

  const headerConfig = useMemo(
    () => ({
      mode,
      backHref,
      backLabel,
      actions: headerActions,
    }),
    [backHref, backLabel, headerActions, mode],
  );

  useAppHeader(headerConfig);

  return null;
}
