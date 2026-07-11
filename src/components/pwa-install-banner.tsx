"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearInstallBannerDismissal,
  clearLegacyInstallDismissals,
  dismissInstallBannerForOneDay,
  getDeferredInstallPrompt,
  installBannerDismissalDurationMs,
  installPromptConsumedEvent,
  installPromptReadyEvent,
  isPwaStandalone,
  promptPwaInstallation,
  readInstallBannerDismissedUntil,
  type BeforeInstallPromptEvent,
  type WindowWithInstallPrompt,
} from "./pwa-install";

type BannerMode = "install" | "update";

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
  const installDismissalTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallDismissed, setIsInstallDismissed] = useState(false);
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  useEffect(() => {
    clearLegacyInstallDismissals();

    const applyDismissal = () => {
      if (installDismissalTimeout.current !== null) {
        clearTimeout(installDismissalTimeout.current);
      }

      const dismissedUntil = readInstallBannerDismissedUntil();
      setIsInstallDismissed(dismissedUntil !== null);

      if (dismissedUntil !== null) {
        installDismissalTimeout.current = setTimeout(() => {
          clearInstallBannerDismissal();
          setIsInstallDismissed(false);
        }, Math.max(0, dismissedUntil - Date.now()));
      }
    };

    const rememberPrompt = () => {
      setPromptEvent(getDeferredInstallPrompt());
      applyDismissal();
    };

    const clearPrompt = () => {
      (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt =
        null;
      setPromptEvent(null);
    };

    const markInstalled = () => {
      clearPrompt();
      clearInstallBannerDismissal();
      setIsInstallDismissed(false);
    };

    rememberPrompt();
    window.addEventListener(installPromptReadyEvent, rememberPrompt);
    window.addEventListener(installPromptConsumedEvent, clearPrompt);
    window.addEventListener("appinstalled", markInstalled);

    return () => {
      if (installDismissalTimeout.current !== null) {
        clearTimeout(installDismissalTimeout.current);
      }
      window.removeEventListener(installPromptReadyEvent, rememberPrompt);
      window.removeEventListener(installPromptConsumedEvent, clearPrompt);
      window.removeEventListener("appinstalled", markInstalled);
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
      : !isInstallDismissed && !isPwaStandalone() && promptEvent !== null
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
      const outcome = await promptPwaInstallation();
      if (outcome === "dismissed") {
        setIsInstallDismissed(true);
      }
    } catch {
      setPromptEvent(null);
    }
  };

  const dismissInstall = () => {
    setIsInstallDismissed(true);
    const dismissedUntil = dismissInstallBannerForOneDay();
    if (installDismissalTimeout.current !== null) {
      clearTimeout(installDismissalTimeout.current);
    }
    installDismissalTimeout.current = setTimeout(() => {
      clearInstallBannerDismissal();
      setIsInstallDismissed(false);
    }, Math.min(installBannerDismissalDurationMs, dismissedUntil - Date.now()));
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
