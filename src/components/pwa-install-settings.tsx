"use client";

import { useEffect, useState } from "react";

import {
  clearPwaInstallDismissal,
  detectInstalledPwa,
  dismissPwaInstallPrompt,
  getInstallPlatform,
  getPwaInstallState,
  isRunningStandalone,
  markPwaInstalled,
  rememberDeferredInstallPrompt,
  subscribeToPwaInstall,
  updateInstalledPwa,
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
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    let isActive = true;

    const unsubscribe = subscribeToPwaInstall(() => {
      const nextState = getPwaInstallState();
      setDeferredPrompt(nextState.deferredPrompt);
      setIsInstalled(nextState.isInstalled || isRunningStandalone());
    });

    void detectInstalledPwa().then((installed) => {
      if (isActive && installed) {
        markPwaInstalled();
        setIsInstalled(true);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const installPlatform =
    typeof window === "undefined" ? "desktop" : getInstallPlatform();

  const handleInstall = async () => {
    clearPwaInstallDismissal();
    setStatusMessage("");

    if (isInstalled) {
      setIsActionPending(true);

      try {
        const result = await updateInstalledPwa();

        if (result === "updated") {
          setStatusMessage("Mise à jour installée. Redémarrage…");
          window.location.reload();
        } else if (result === "current") {
          setStatusMessage("L’application utilise déjà la dernière version.");
        } else {
          setStatusMessage(
            "La mise à jour automatique n’est pas disponible sur ce navigateur.",
          );
        }
      } catch {
        setStatusMessage(
          "La mise à jour n’a pas pu être vérifiée. Réessayez dans quelques instants.",
        );
      } finally {
        setIsActionPending(false);
      }

      return;
    }

    const promptEvent = deferredPrompt;

    if (promptEvent !== null) {
      setIsActionPending(true);

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
        setIsActionPending(false);
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
          {isInstalled
            ? "Vérifiez et installez la dernière version de ChurchERP sur cet appareil."
            : "Installez ChurchERP sur cet appareil, même si la proposition automatique a déjà été fermée."}
        </p>
      </div>

      <div className="settings-install-card__actions">
        <button
          className="settings-install-card__button"
          disabled={isActionPending}
          onClick={() => void handleInstall()}
          type="button"
        >
          {isInstalled
            ? isActionPending
              ? "Mise à jour…"
              : "Mettre à jour l’application"
            : isActionPending
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
