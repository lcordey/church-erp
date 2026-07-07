"use client";

import { useEffect, useState } from "react";
import {
  clearPwaInstallDismissal,
  dismissPwaInstallPrompt,
  getEarlyInstallPrompt,
  getInstallPlatform,
  isPwaInstallDismissed,
  isRunningStandalone,
  markPwaInstalled,
  rememberDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "./pwa-install";

export function PwaInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const installPlatform =
    typeof window === "undefined" ? "desktop" : getInstallPlatform();

  useEffect(() => {
    const platform = getInstallPlatform();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      rememberDeferredInstallPrompt(promptEvent);
      setDeferredPrompt(promptEvent);

      if (!isPwaInstallDismissed()) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      markPwaInstalled();
      setDeferredPrompt(null);
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const earlyPrompt = getEarlyInstallPrompt();
    const earlyPromptTimer = earlyPrompt
      ? window.setTimeout(() => {
          rememberDeferredInstallPrompt(earlyPrompt);
          setDeferredPrompt(earlyPrompt);

          if (!isPwaInstallDismissed()) {
            setIsVisible(true);
          }
        }, 0)
      : null;

    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        if (!isRunningStandalone()) {
          const activateWaitingWorker = () => {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          };
          const watchInstallingWorker = () => {
            const installingWorker = registration.installing;

            if (!installingWorker) {
              return;
            }

            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed") {
                activateWaitingWorker();
              }
            });
          };

          registration.addEventListener("updatefound", watchInstallingWorker);
          activateWaitingWorker();
          watchInstallingWorker();
        }
      } catch {
        // Failing to register should not break the app shell.
      }
    };

    void registerServiceWorker();

    const canShowManualInstallHelp =
      (platform === "ios" || platform === "android") &&
      !isRunningStandalone() &&
      !isPwaInstallDismissed();

    const revealTimer =
      canShowManualInstallHelp
        ? window.setTimeout(() => {
            setIsVisible(true);
          }, 0)
        : null;

    return () => {
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer);
      }
      if (earlyPromptTimer !== null) {
        window.clearTimeout(earlyPromptTimer);
      }
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleInstall = async () => {
    const promptEvent = deferredPrompt;

    if (promptEvent === null) {
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    rememberDeferredInstallPrompt(null);
    setDeferredPrompt(null);
    setIsVisible(false);

    if (choice.outcome === "dismissed") {
      dismissPwaInstallPrompt();
    } else {
      clearPwaInstallDismissal();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismissPwaInstallPrompt();
  };

  const isNativePromptAvailable = deferredPrompt !== null;
  const showManualInstallInstructions =
    (installPlatform === "ios" || installPlatform === "android") &&
    !isNativePromptAvailable;

  if (!isNativePromptAvailable && !showManualInstallInstructions) {
    return null;
  }

  const manualInstallInstructions =
    installPlatform === "android"
      ? "Sur Android, ouvrez le menu ⋮ de Chrome puis choisissez \"Installer l'application\". Si Chrome affiche seulement \"Ajouter à l'écran d'accueil\", rechargez cette page et réessayez après quelques secondes."
      : "Sur iPhone, ouvrez le menu Partager puis choisissez \"Sur l'écran d'accueil\".";

  return (
    <section className="pwa-install-prompt" aria-label="Installer l'application">
      <div className="pwa-install-prompt__copy">
        <p className="pwa-install-prompt__eyebrow">Application mobile</p>
        <h2>
          {isNativePromptAvailable
            ? "Installer ChurchERP sur ce téléphone"
            : "Ajouter ChurchERP à l'écran d'accueil"}
        </h2>
        <p>
          {isNativePromptAvailable
            ? "Accès plus rapide depuis l'écran d'accueil, comme une vraie application."
            : manualInstallInstructions}
        </p>
      </div>

      <div className="pwa-install-prompt__actions">
        {isNativePromptAvailable ? (
          <button
            className="pwa-install-prompt__button pwa-install-prompt__button--primary"
            onClick={handleInstall}
            type="button"
          >
            Installer
          </button>
        ) : null}
        <button
          className="pwa-install-prompt__button"
          onClick={handleDismiss}
          type="button"
        >
          {isNativePromptAvailable ? "Plus tard" : "Fermer"}
        </button>
      </div>
    </section>
  );
}
