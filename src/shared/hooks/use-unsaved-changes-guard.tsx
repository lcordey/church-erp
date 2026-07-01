"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PendingAction = (() => void | Promise<void>) | null;

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean;
  onSave: () => Promise<boolean>;
};

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function useUnsavedChangesGuard({
  isDirty,
  onSave,
}: UseUnsavedChangesGuardOptions) {
  const router = useRouter();
  const pendingActionRef = useRef<PendingAction>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const closeDialog = useCallback(() => {
    pendingActionRef.current = null;
    setIsDialogOpen(false);
  }, []);

  const runPendingAction = useCallback(async () => {
    const action = pendingActionRef.current;

    closeDialog();

    if (action) {
      await action();
    }
  }, [closeDialog]);

  const confirmNavigation = useCallback(
    async (action: () => void | Promise<void>) => {
      if (!isDirty) {
        await action();
        return true;
      }

      pendingActionRef.current = action;
      setIsDialogOpen(true);
      return false;
    },
    [isDirty],
  );

  const saveAndContinue = useCallback(async () => {
    setIsSaving(true);

    try {
      const saved = await onSave();

      if (!saved) {
        return;
      }

      await runPendingAction();
    } finally {
      setIsSaving(false);
    }
  }, [onSave, runPendingAction]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        isModifiedClick(event)
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest<HTMLAnchorElement>("a[href]");

      if (!link) {
        return;
      }

      if (
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("href")?.startsWith("#") ||
        link.getAttribute("href")?.startsWith("mailto:") ||
        link.getAttribute("href")?.startsWith("tel:")
      ) {
        return;
      }

      const href = link.href;

      if (!href || href === window.location.href) {
        return;
      }

      event.preventDefault();
      pendingActionRef.current =
        link.origin === window.location.origin
          ? () => router.push(`${link.pathname}${link.search}${link.hash}`)
          : () => window.location.assign(href);
      setIsDialogOpen(true);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, router]);

  const dialog = isDialogOpen ? (
    <div
      aria-labelledby="unsaved-changes-title"
      aria-modal="true"
      className="app-dialog-backdrop"
      role="dialog"
    >
      <section className="app-dialog app-dialog--compact">
        <div className="app-dialog__header">
          <div>
            <h2 id="unsaved-changes-title">Modifications non enregistrées</h2>
          </div>
        </div>
        <div className="app-dialog__body">
          <p>Enregistrer les modifications avant de quitter&nbsp;?</p>
          <div className="app-dialog__actions">
            <button
              className="admin-button admin-button--primary"
              disabled={isSaving}
              onClick={() => void saveAndContinue()}
              type="button"
            >
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              className="admin-button admin-button--quiet"
              disabled={isSaving}
              onClick={closeDialog}
              type="button"
            >
              Annuler
            </button>
            <button
              className="admin-button admin-button--danger"
              disabled={isSaving}
              onClick={() => void runPendingAction()}
              type="button"
            >
              Quitter sans enregistrer
            </button>
          </div>
        </div>
      </section>
    </div>
  ) : null;

  return { confirmNavigation, dialog };
}
