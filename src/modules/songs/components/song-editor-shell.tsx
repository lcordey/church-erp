"use client";

import { useCallback, useMemo, useState } from "react";

import { AppTopBar } from "@/src/components/app-top-bar";
import { useUnsavedChangesGuard } from "@/src/shared/hooks/use-unsaved-changes-guard";

import type { AdminSong } from "../types/admin-song";
import type { SongTaxonomies } from "../types/song-taxonomy";
import { AdminSongForm } from "./admin-song-form";

type SongEditorState = {
  isDirty: boolean;
  isPending: boolean;
  submit: () => Promise<boolean>;
};

type SongEditorShellProps = {
  activeViewMode?: "selection" | "edition";
  availableTaxonomies: SongTaxonomies;
  backHref: string;
  backLabel: string;
  backIconOnly?: boolean;
  mode: "admin" | "public";
  onDeleted?: () => void;
  onSaved?: (song: AdminSong) => void;
  onViewModeChange?: (mode: "selection" | "edition") => void;
  showViewModeToggle?: boolean;
  song?: AdminSong | null;
};

const idleEditorState: SongEditorState = {
  isDirty: false,
  isPending: false,
  submit: async () => false,
};

export function SongEditorShell({
  activeViewMode,
  availableTaxonomies,
  backHref,
  backIconOnly = false,
  backLabel,
  mode,
  onDeleted,
  onSaved,
  onViewModeChange,
  showViewModeToggle,
  song = null,
}: SongEditorShellProps) {
  const [editorState, setEditorState] = useState<SongEditorState>(idleEditorState);
  const { confirmNavigation, dialog } = useUnsavedChangesGuard({
    isDirty: editorState.isDirty,
    onSave: editorState.submit,
  });

  const saveButtonClassName = editorState.isDirty
    ? "admin-button admin-button--primary admin-button--dirty"
    : "admin-button";

  const headerActions = useMemo(
    () => (
      <button
        className={saveButtonClassName}
        disabled={editorState.isPending}
        onClick={() => {
          void editorState.submit();
        }}
        type="button"
      >
        {editorState.isPending
          ? "Enregistrement…"
          : editorState.isDirty
            ? "Enregistrer •"
            : "Enregistrer"}
      </button>
    ),
    [editorState, saveButtonClassName],
  );

  const handleViewModeChange = useCallback(
    (nextMode: "selection" | "edition") => {
      if (!onViewModeChange) {
        return;
      }

      if (nextMode === "selection" && editorState.isDirty) {
        void confirmNavigation(() => onViewModeChange(nextMode));
        return;
      }

      onViewModeChange(nextMode);
    },
    [confirmNavigation, editorState.isDirty, onViewModeChange],
  );

  return (
    <>
      <AppTopBar
        actions={headerActions}
        activeViewMode={activeViewMode}
        backHref={backHref}
        backIconOnly={backIconOnly}
        backLabel={backLabel}
        mode={mode}
        onViewModeChange={handleViewModeChange}
        showViewModeToggle={showViewModeToggle}
      />
      <AdminSongForm
        availableTaxonomies={availableTaxonomies}
        onDeleted={onDeleted}
        onEditorStateChange={setEditorState}
        onSaved={onSaved}
        showBackAction={false}
        showSaveAction={false}
        song={song ?? undefined}
      />
      {dialog}
    </>
  );
}
