"use client";

import { useCallback, useState } from "react";

import { PageTransitionStatus } from "@/src/components/page-transition-status";

export type ViewMode = "selection" | "edition";

type UseViewModeNavigationOptions = {
  activeMode?: ViewMode;
  detail?: string;
  subject: string;
};

function modeLabel(mode: ViewMode) {
  return mode === "edition" ? "édition" : "lecture";
}

export function useViewModeNavigation({
  activeMode,
  detail,
  subject,
}: UseViewModeNavigationOptions) {
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode | null>(null);

  const navigateToViewMode = useCallback((nextMode: ViewMode, navigate: () => void) => {
    setPendingViewMode(nextMode);
    navigate();
  }, []);

  const visiblePendingViewMode =
    activeMode && pendingViewMode === activeMode ? null : pendingViewMode;

  const transitionStatus = visiblePendingViewMode ? (
    <PageTransitionStatus
      detail={detail ?? `Le mode ${modeLabel(visiblePendingViewMode)} est en cours de chargement.`}
      isVisible
      label={`Passage ${subject} en mode ${modeLabel(visiblePendingViewMode)}…`}
    />
  ) : null;

  return {
    isViewModeNavigating: visiblePendingViewMode !== null,
    navigateToViewMode,
    pendingViewMode: visiblePendingViewMode,
    transitionStatus,
  };
}
