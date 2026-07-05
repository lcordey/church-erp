"use client";

import { useEffect, useState } from "react";

import {
  clearPwaInstallDismissal,
  dismissPwaInstallPrompt,
  getInstallPlatform,
  getPwaInstallState,
  isRunningStandalone,
  markPwaInstalled,
  rememberDeferredInstallPrompt,
  subscribeToPwaInstall,
} from "./pwa-install";

export function PwaInstallSettings() {
  const [deferredPrompt, setDeferredPrompt] = useState(
    () => getPwaInstallState().deferredPrompt,
  );
  const [isInstalled, setIsInstalled] = useState(
    () =>
      getPwaInstallState().isInstalled ||
      (typeof window !== "undefined" && isRunningStandalone()),
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [isPromptPending, setIsPromptPending] = useState(false);

  useEffect(() => {
    return subscribeToPwaInstall(() => {
      const nextState = getPwaInstallState();
      setDeferredPrompt(nextState.deferredPrompt);
      setIsInstalled(nextState.isInstalled || isRunningStandalone());
    });
  }, []);

  const installPlatform =
    typeof window === "undefined" ? "desktop" : getInstallPlatform();

  const handleInstall = async () => {
    clearPwaInstallDismissal();
    setStatusMessage("");
    const promptEvent = deferredPrompt;

    if (promptEvent !== null) {
      setIsPromptPending(true);

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        rememberDeferredInstallPrompt(null);

        if (choice.outcome === "accepted") {
          clearPwaInstallDismissal();
          markPwaInstalled();
          setDeferredPrompt(null);
          setStatusMessage("L’installation a été lancée sur cet appareil.");
        } else {
          dismissPwaInstallPrompt();
          setDeferredPrompt(null);
          setStatusMessage("La demande d’installation a été refermée.");
        }
      } finally {
        setIsPromptPending(false);
      }

      return;
    }

    if (installPlatform === "ios") {
      setStatusMessage(
        "Sur iPhone ou iPad, ouvrez le menu Partager de Safari puis choisissez « Sur l’écran d’accueil ».",
      );
      return;
    }

    if (installPlatform === "desktop") {
      setStatusMessage(
        "Utilisez le menu du navigateur puis l’option d’installation de l’application.",
      );
      return;
    }

    setStatusMessage(
      "Si la fenêtre d’installation n’apparaît pas, ouvrez le menu du navigateur puis choisissez l’option d’installation.",
    );
  };

  return (
    <div className="settings-install-card">
      <div>
        <h2>Application</h2>
        <p>
          Relancez l’installation de ChurchERP sur cet appareil, même si la
          proposition automatique a déjà été fermée.
        </p>
      </div>

      <div className="settings-install-card__actions">
        <button
          className="settings-install-card__button"
          disabled={isInstalled || isPromptPending}
          onClick={() => void handleInstall()}
          type="button"
        >
          {isInstalled
            ? "Application déjà installée"
            : isPromptPending
              ? "Ouverture…"
              : "Télécharger l’application"}
        </button>
        {statusMessage ? (
          <p className="settings-install-card__status">{statusMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
