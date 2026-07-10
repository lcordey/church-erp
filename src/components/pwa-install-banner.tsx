"use client";

import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type WindowWithInstallPrompt = Window & {
  __churchErpDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  __churchErpServiceWorkerRegistrationPromise?: Promise<ServiceWorkerRegistration | null>;
};

type BannerMode = "install" | "update";

const legacyDismissKeys = [
  "churcherp:pwa-install-banner-dismissed",
  "churcherp:pwa-install-banner-dismissed-at",
];

function getDeferredPrompt() {
  return (
    (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt ?? null
  );
}

function isStandalone() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function clearPersistentInstallDismissals() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    legacyDismissKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in private modes; installation still works.
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  const browserWindow = window as WindowWithInstallPrompt;

  browserWindow.__churchErpServiceWorkerRegistrationPromise ??=
    navigator.serviceWorker.register("/sw.js").catch(() => null);

  return browserWindow.__churchErpServiceWorkerRegistrationPromise;
}

export function PwaInstallBanner() {
  const shouldReloadForUpdate = useRef(false);
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallDismissed, setIsInstallDismissed] = useState(false);
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  useEffect(() => {
    clearPersistentInstallDismissals();

    const rememberPrompt = () => {
      setPromptEvent(getDeferredPrompt());
      setIsInstallDismissed(false);
    };

    const clearPrompt = () => {
      (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt =
        null;
      setPromptEvent(null);
    };

    rememberPrompt();
    window.addEventListener("churcherpinstallpromptready", rememberPrompt);
    window.addEventListener("appinstalled", clearPrompt);

    return () => {
      window.removeEventListener("churcherpinstallpromptready", rememberPrompt);
      window.removeEventListener("appinstalled", clearPrompt);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;
    let removeUpdateFoundListener: (() => void) | null = null;
    const removeWorkerListeners: Array<() => void> = [];

    const markWaitingUpdate = (
      candidateRegistration: ServiceWorkerRegistration,
    ) => {
      if (
        isMounted &&
        navigator.serviceWorker.controller !== null &&
        candidateRegistration.waiting !== null
      ) {
        setWaitingRegistration(candidateRegistration);
        setIsUpdateDismissed(false);
      }
    };

    const watchInstallingWorker = (
      worker: ServiceWorker,
      candidateRegistration: ServiceWorkerRegistration,
    ) => {
      const handleStateChange = () => {
        if (worker.state === "installed") {
          markWaitingUpdate(candidateRegistration);
        }
      };

      worker.addEventListener("statechange", handleStateChange);
      removeWorkerListeners.push(() =>
        worker.removeEventListener("statechange", handleStateChange),
      );
    };

    const handleControllerChange = () => {
      if (!shouldReloadForUpdate.current) {
        return;
      }

      shouldReloadForUpdate.current = false;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    void registerServiceWorker().then(async (currentRegistration) => {
      if (!isMounted || currentRegistration === null) {
        return;
      }

      markWaitingUpdate(currentRegistration);

      if (currentRegistration.installing !== null) {
        watchInstallingWorker(
          currentRegistration.installing,
          currentRegistration,
        );
      }

      const handleUpdateFound = () => {
        if (currentRegistration.installing !== null) {
          watchInstallingWorker(
            currentRegistration.installing,
            currentRegistration,
          );
        }
      };

      currentRegistration.addEventListener("updatefound", handleUpdateFound);
      removeUpdateFoundListener = () =>
        currentRegistration.removeEventListener(
          "updatefound",
          handleUpdateFound,
        );

      try {
        await currentRegistration.update();
      } catch {}

      markWaitingUpdate(currentRegistration);
    });

    return () => {
      isMounted = false;
      removeUpdateFoundListener?.();
      removeWorkerListeners.forEach((removeListener) => removeListener());
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  const mode: BannerMode | null =
    waitingRegistration !== null && !isUpdateDismissed
      ? "update"
      : !isInstallDismissed && !isStandalone() && promptEvent !== null
        ? "install"
        : null;

  if (mode === null) {
    return null;
  }

  const install = async () => {
    if (promptEvent === null) {
      return;
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt =
        null;
      setPromptEvent(null);

      if (choice.outcome === "dismissed") {
        setIsInstallDismissed(true);
      }
    } catch {
      setPromptEvent(null);
    }
  };

  const dismissInstall = () => {
    setIsInstallDismissed(true);
  };

  const applyUpdate = () => {
    const waitingWorker = waitingRegistration?.waiting;

    if (waitingWorker === undefined || waitingWorker === null) {
      setWaitingRegistration(null);
      return;
    }

    setIsApplyingUpdate(true);
    shouldReloadForUpdate.current = true;
    waitingWorker.postMessage({ type: "CHURCH_ERP_SKIP_WAITING" });
  };

  return (
    <section
      className="pwa-install-banner"
      aria-label={
        mode === "update"
          ? "Mettre à jour l'application"
          : "Installer l'application"
      }
    >
      <div>
        <p className="pwa-install-banner__eyebrow">
          {mode === "update" ? "Mise à jour" : "Application"}
        </p>
        <h2>
          {mode === "update"
            ? "Une nouvelle version est disponible"
            : "Installer ChurchERP sur cet appareil"}
        </h2>
        <p>
          {mode === "update"
            ? "Appliquez-la maintenant pour récupérer les derniers correctifs."
            : "Utilisez le bouton du site pour ajouter l’application PWA à votre écran d’accueil."}
        </p>
      </div>
      <div className="pwa-install-banner__actions">
        <button
          className="pwa-install-banner__button pwa-install-banner__button--primary"
          disabled={isApplyingUpdate}
          onClick={() => (mode === "update" ? applyUpdate() : void install())}
          type="button"
        >
          {mode === "update"
            ? isApplyingUpdate
              ? "Mise à jour…"
              : "Mettre à jour"
            : "Installer"}
        </button>
        <button
          className="pwa-install-banner__button"
          onClick={
            mode === "update"
              ? () => setIsUpdateDismissed(true)
              : dismissInstall
          }
          type="button"
        >
          Plus tard
        </button>
      </div>
    </section>
  );
}
