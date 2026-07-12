"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ViewModeToggleProps = {
  mode: "public" | "admin";
  activeMode?: "selection" | "edition";
  onModeChange?: (mode: "selection" | "edition") => void;
  pendingMode?: "selection" | "edition" | null;
};

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 16-.8 4.8L8 20l10.5-10.5-4-4L4 16Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function ViewModeToggle({
  mode,
  activeMode,
  onModeChange,
  pendingMode = null,
}: ViewModeToggleProps) {
  const router = useRouter();
  const currentMode = activeMode ?? (mode === "admin" ? "edition" : "selection");
  const isPending = pendingMode !== null;

  useEffect(() => {
    router.prefetch("/worship");
    router.prefetch("/worship?mode=edition");
  }, [router]);

  if (onModeChange) {
    return (
      <nav className="view-mode-toggle" aria-label="Mode d’affichage">
        <button
          aria-pressed={currentMode === "selection"}
          disabled={isPending}
          onClick={() => {
            if (currentMode === "selection") {
              return;
            }

            onModeChange("selection");
          }}
          title="Mode lecture"
          type="button"
        >
          {pendingMode === "selection" ? <span aria-hidden="true" className="button-spinner" /> : <EyeIcon />}
          <span>Lecture</span>
        </button>
        <button
          aria-pressed={currentMode === "edition"}
          disabled={isPending}
          onClick={() => {
            if (currentMode === "edition") {
              return;
            }

            onModeChange("edition");
          }}
          title="Mode édition"
          type="button"
        >
          {pendingMode === "edition" ? <span aria-hidden="true" className="button-spinner" /> : <EditIcon />}
          <span>Édition</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="view-mode-toggle" aria-label="Mode d’affichage">
      <Link
        aria-current={currentMode === "selection" ? "page" : undefined}
        href="/worship"
        title="Mode lecture"
      >
        <EyeIcon />
        <span>Lecture</span>
      </Link>
      <Link
        aria-current={currentMode === "edition" ? "page" : undefined}
        href="/worship?mode=edition"
        title="Mode édition"
      >
        <EditIcon />
        <span>Édition</span>
      </Link>
    </nav>
  );
}
