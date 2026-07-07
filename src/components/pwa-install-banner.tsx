"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type WindowWithInstallPrompt = Window & {
  __churchErpDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
};

type PwaInstallBannerProps = {
  isAuthenticated: boolean;
};

const dismissKey = "churcherp:pwa-install-banner-dismissed";

function getDeferredPrompt() {
  return (
    (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt ?? null
  );
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function hasDismissedBanner() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(dismissKey) === "1";
  } catch {
    return false;
  }
}

export function PwaInstallBanner({ isAuthenticated }: PwaInstallBannerProps) {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(hasDismissedBanner);

  useEffect(() => {
    if (!isAuthenticated || isStandalone()) {
      return;
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const rememberPrompt = () => {
      setPromptEvent(getDeferredPrompt());
    };

    rememberPrompt();
    window.addEventListener("churcherpinstallpromptready", rememberPrompt);

    return () => {
      window.removeEventListener("churcherpinstallpromptready", rememberPrompt);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || isDismissed || promptEvent === null) {
    return null;
  }

  const install = async () => {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt = null;
    setPromptEvent(null);

    if (choice.outcome === "dismissed") {
      window.localStorage.setItem(dismissKey, "1");
      setIsDismissed(true);
    }
  };

  const dismiss = () => {
    window.localStorage.setItem(dismissKey, "1");
    setIsDismissed(true);
  };

  return (
    <section className="pwa-install-banner" aria-label="Installer l'application">
      <div>
        <p className="pwa-install-banner__eyebrow">Application</p>
        <h2>Installer ChurchERP sur cet appareil</h2>
        <p>Accédez plus vite au répertoire depuis l’écran d’accueil.</p>
      </div>
      <div className="pwa-install-banner__actions">
        <button
          className="pwa-install-banner__button pwa-install-banner__button--primary"
          onClick={() => void install()}
          type="button"
        >
          Installer
        </button>
        <button
          className="pwa-install-banner__button"
          onClick={dismiss}
          type="button"
        >
          Plus tard
        </button>
      </div>
    </section>
  );
}
