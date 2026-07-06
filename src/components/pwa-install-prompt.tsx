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
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // Failing to register should not break the app shell.
      }
    };

    void registerServiceWorker();

    const revealTimer =
      platform === "ios" &&
      !isRunningStandalone() &&
      !isPwaInstallDismissed()
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
    setDeferredPrompt(null);
    setIsVisible(false);
    dismissPwaInstallPrompt();
  };

  const isNativePromptAvailable = deferredPrompt !== null;
  const showManualIosInstructions =
    installPlatform === "ios" && !isNativePromptAvailable;

  if (!isNativePromptAvailable && !showManualIosInstructions) {
    return null;
  }

  return (
    <section className="pwa-install-prompt" aria-label="Installer l'application">
      <div className="pwa-install-prompt__copy">
        <p className="pwa-install-prompt__eyebrow">Application mobile</p>
        <h2>
          {isNativePromptAvailable
            ? "Télécharger ChurchERP sur ce téléphone"
            : "Ajouter ChurchERP à l'écran d'accueil"}
        </h2>
        <p>
          {isNativePromptAvailable
            ? "Accès plus rapide depuis l'écran d'accueil, comme une vraie application."
            : "Sur iPhone, ouvrez le menu Partager puis choisissez \"Sur l'écran d'accueil\"."}
        </p>
      </div>

      <div className="pwa-install-prompt__actions">
        {isNativePromptAvailable ? (
          <button
            className="pwa-install-prompt__button pwa-install-prompt__button--primary"
            onClick={handleInstall}
            type="button"
          >
            Télécharger
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
