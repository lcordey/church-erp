"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
  userAgentData?: {
    mobile?: boolean;
  };
};

const DISMISS_KEY = "churcherp:pwa-install-dismissed";

type InstallPlatform = "ios" | "android" | "other-mobile" | "desktop";

function isMobileDevice(): boolean {
  const navigatorWithHints = window.navigator as NavigatorWithStandalone;

  if (typeof navigatorWithHints.userAgentData?.mobile === "boolean") {
    return navigatorWithHints.userAgentData.mobile;
  }

  const userAgent = window.navigator.userAgent;
  const isMobileUserAgent =
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(userAgent);
  const isIpadDesktopMode =
    /Macintosh/i.test(userAgent) && window.navigator.maxTouchPoints > 1;
  const hasTouchPrimaryInput = window.matchMedia("(pointer: coarse)").matches;

  return (isMobileUserAgent || isIpadDesktopMode) && hasTouchPrimaryInput;
}

function getInstallPlatform(): InstallPlatform {
  if (!isMobileDevice()) {
    return "desktop";
  }

  const userAgent = window.navigator.userAgent;
  const isIpadDesktopMode =
    /Macintosh/i.test(userAgent) && window.navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/i.test(userAgent) || isIpadDesktopMode) {
    return "ios";
  }

  if (/Android/i.test(userAgent)) {
    return "android";
  }

  return "other-mobile";
}

export function PwaInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const installPlatform =
    typeof window === "undefined" ? "desktop" : getInstallPlatform();

  useEffect(() => {
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

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari on iOS still exposes this flag.
      (window.navigator as NavigatorWithStandalone).standalone === true;
    const platform = getInstallPlatform();

    if (isStandalone || platform === "desktop") {
      return;
    }

    if (window.localStorage.getItem(DISMISS_KEY) === "true") {
      return;
    }

    const revealTimer =
      platform === "ios"
        ? window.setTimeout(() => {
            setIsVisible(true);
          }, 0)
        : null;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer);
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
    setDeferredPrompt(null);
    setIsVisible(false);

    if (choice.outcome === "dismissed") {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } else {
      window.localStorage.removeItem(DISMISS_KEY);
    }
  };

  const handleDismiss = () => {
    setDeferredPrompt(null);
    setIsVisible(false);
    window.localStorage.setItem(DISMISS_KEY, "true");
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
