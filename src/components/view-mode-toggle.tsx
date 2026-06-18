"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ViewModeToggleProps = {
  mode: "public" | "admin";
  activeMode?: "selection" | "edition";
  onModeChange?: (mode: "selection" | "edition") => void;
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
}: ViewModeToggleProps) {
  const router = useRouter();
  const currentMode = activeMode ?? (mode === "admin" ? "edition" : "selection");

  useEffect(() => {
    router.prefetch("/worship");
    router.prefetch("/worship?mode=edition");
  }, [router]);

  if (onModeChange) {
    return (
      <nav className="view-mode-toggle" aria-label="Mode d’affichage">
        <button
          aria-pressed={currentMode === "selection"}
          onClick={() => onModeChange("selection")}
          title="Mode sélection"
          type="button"
        >
          <EyeIcon />
          <span>Sélection</span>
        </button>
        <button
          aria-pressed={currentMode === "edition"}
          onClick={() => onModeChange("edition")}
          title="Mode édition"
          type="button"
        >
          <EditIcon />
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
        title="Mode sélection"
      >
        <EyeIcon />
        <span>Sélection</span>
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
