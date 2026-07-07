"use client";

import { useEffect, useState } from "react";

import {
  clearPwaInstallDismissal,
  detectInstalledPwa,
  getAvailableInstallPrompt,
  dismissPwaInstallPrompt,
  getInstallPlatform,
  getPwaInstallState,
  isRunningStandalone,
  markPwaInstalled,
  markPwaNotInstalled,
  rememberDeferredInstallPrompt,
  subscribeToPwaInstall,
  updateInstalledPwa,
  waitForPwaInstallPrompt,
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

    const refreshInstalledState = () => {
      void detectInstalledPwa().then((installation) => {
        if (!isActive) {
          return;
        }

        if (installation === "installed") {
          markPwaInstalled();
          setIsInstalled(true);
        } else if (installation === "not-installed") {
          markPwaNotInstalled();
          setIsInstalled(false);
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshInstalledState();
      }
    };

    refreshInstalledState();
    window.addEventListener("pageshow", refreshInstalledState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      window.removeEventListener("pageshow", refreshInstalledState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, []);

  const installPlatform =
    typeof window === "undefined" ? "desktop" : getInstallPlatform();

  const promptForInstallation = async () => {
    const promptEvent =
      deferredPrompt ??
      getAvailableInstallPrompt() ??
      (await waitForPwaInstallPrompt());

    if (promptEvent === null) {
      return false;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    rememberDeferredInstallPrompt(null);
    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      clearPwaInstallDismissal();
      setStatusMessage(
        "Installation acceptée. ChurchERP apparaîtra dans vos applications.",
      );
    } else {
      dismissPwaInstallPrompt();
      setStatusMessage("La demande d’installation a été refermée.");
    }

    return true;
  };

  const handleInstall = async () => {
    clearPwaInstallDismissal();
    setStatusMessage("");
    setIsActionPending(true);

    try {
      if (isInstalled) {
        const installation = await detectInstalledPwa();

        if (installation === "not-installed") {
          markPwaNotInstalled();
          setIsInstalled(false);

          if (await promptForInstallation()) {
            return;
          }
        } else {
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

          return;
        }
      } else if (await promptForInstallation()) {
        return;
      }

      if (installPlatform === "ios") {
        setStatusMessage(
          "Sur iPhone ou iPad, ouvrez cette page dans Safari, puis le menu Partager et choisissez « Sur l’écran d’accueil ».",
        );
        return;
      }

      if (!window.isSecureContext) {
        setStatusMessage(
          "L’installation exige une adresse HTTPS. Ouvrez ChurchERP avec une adresse qui commence par https:// puis réessayez.",
        );
        return;
      }

      if (!("serviceWorker" in navigator)) {
        setStatusMessage(
          "Ce navigateur ne permet pas d’installer ChurchERP comme application.",
        );
        return;
      }

      if (installPlatform === "desktop") {
        setStatusMessage(
          "Chrome ne propose pas encore l’installation. Rechargez la page, attendez quelques secondes, puis choisissez « Installer ChurchERP » dans la barre d’adresse ou le menu du navigateur.",
        );
        return;
      }

      setStatusMessage(
        "Chrome ne propose pas encore l’installation. Rechargez la page, attendez quelques secondes, puis ouvrez le menu ⋮ et choisissez « Installer l’application ». « Ajouter à l’écran d’accueil » seul crée uniquement un raccourci.",
      );
    } catch {
      setStatusMessage(
        isInstalled
          ? "La mise à jour n’a pas pu être vérifiée. Réessayez dans quelques instants."
          : "L’installation n’a pas pu être ouverte. Rechargez la page puis réessayez.",
      );
    } finally {
      setIsActionPending(false);
    }
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
              : "Installer l’application"}
        </button>
        {statusMessage ? (
          <p className="settings-install-card__status">{statusMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
