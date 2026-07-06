"use client";

export type BeforeInstallPromptEvent = Event & {
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
  getInstalledRelatedApps?: () => Promise<
    Array<{
      id?: string;
      platform?: string;
      url?: string;
    }>
  >;
};

type WindowWithInstallPrompt = Window & {
  __churchErpInstallPrompt?: BeforeInstallPromptEvent | null;
};

export type InstallPlatform = "ios" | "android" | "other-mobile" | "desktop";
export type PwaUpdateResult = "current" | "updated" | "unsupported";

export const PWA_INSTALL_DISMISS_KEY = "churcherp:pwa-install-dismissed";

let currentDeferredPrompt: BeforeInstallPromptEvent | null = null;
let isAppInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeToPwaInstall(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getPwaInstallState() {
  return {
    deferredPrompt: currentDeferredPrompt,
    isInstalled: isAppInstalled,
  };
}

export function rememberDeferredInstallPrompt(
  promptEvent: BeforeInstallPromptEvent | null,
) {
  currentDeferredPrompt = promptEvent;

  if (typeof window !== "undefined") {
    (window as WindowWithInstallPrompt).__churchErpInstallPrompt = promptEvent;
  }

  notifyListeners();
}

export function getEarlyInstallPrompt() {
  return (
    (window as WindowWithInstallPrompt).__churchErpInstallPrompt ??
    currentDeferredPrompt
  );
}

export function markPwaInstalled() {
  currentDeferredPrompt = null;
  isAppInstalled = true;
  notifyListeners();
}

export function clearPwaInstallDismissal() {
  window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
}

export function dismissPwaInstallPrompt() {
  window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "true");
}

export function isPwaInstallDismissed() {
  return window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "true";
}

export function isMobileDevice(): boolean {
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

export function getInstallPlatform(): InstallPlatform {
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

export function isRunningStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

export async function detectInstalledPwa() {
  if (isRunningStandalone()) {
    return true;
  }

  const navigatorWithRelatedApps =
    window.navigator as NavigatorWithStandalone;

  if (!navigatorWithRelatedApps.getInstalledRelatedApps) {
    return false;
  }

  try {
    const relatedApps =
      await navigatorWithRelatedApps.getInstalledRelatedApps();

    return relatedApps.some((app) => app.platform === "webapp");
  } catch {
    return false;
  }
}

function waitForWorkerInstallation(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorker | null> {
  const worker = registration.installing;

  if (!worker) {
    return Promise.resolve(registration.waiting);
  }

  if (worker.state === "installed") {
    return Promise.resolve(registration.waiting ?? worker);
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      worker.removeEventListener("statechange", handleStateChange);
      resolve(null);
    }, 10_000);

    const handleStateChange = () => {
      if (worker.state === "installed") {
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", handleStateChange);
        resolve(registration.waiting ?? worker);
      } else if (worker.state === "redundant") {
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", handleStateChange);
        resolve(null);
      }
    };

    worker.addEventListener("statechange", handleStateChange);
  });
}

function waitForControllerChange(): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      resolve();
    }, 5_000);

    const handleControllerChange = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      resolve();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
  });
}

export async function updateInstalledPwa(): Promise<PwaUpdateResult> {
  if (!("serviceWorker" in navigator)) {
    return "unsupported";
  }

  const registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    return "unsupported";
  }

  await registration.update();

  const waitingWorker =
    registration.waiting ?? (await waitForWorkerInstallation(registration));

  if (!waitingWorker || !navigator.serviceWorker.controller) {
    return "current";
  }

  const controllerChange = waitForControllerChange();
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
  await controllerChange;

  return "updated";
}
