"use client";

import { useCallback, useState } from "react";

import { PageTransitionStatus } from "@/src/components/page-transition-status";

export type ViewMode = "selection" | "edition";

type UseViewModeNavigationOptions = {
  detail?: string;
  subject: string;
};

function modeLabel(mode: ViewMode) {
  return mode === "edition" ? "édition" : "lecture";
}

export function useViewModeNavigation({ detail, subject }: UseViewModeNavigationOptions) {
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode | null>(null);

  const navigateToViewMode = useCallback((nextMode: ViewMode, navigate: () => void) => {
    setPendingViewMode(nextMode);
    navigate();
  }, []);

  const transitionStatus = pendingViewMode ? (
    <PageTransitionStatus
      detail={detail ?? `Le mode ${modeLabel(pendingViewMode)} est en cours de chargement.`}
      isVisible
      label={`Passage ${subject} en mode ${modeLabel(pendingViewMode)}…`}
    />
  ) : null;

  return {
    isViewModeNavigating: pendingViewMode !== null,
    navigateToViewMode,
    pendingViewMode,
    transitionStatus,
  };
}
