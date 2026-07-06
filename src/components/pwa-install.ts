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
export type InstalledPwaDetection = "installed" | "not-installed" | "unsupported";

export const PWA_INSTALL_DISMISS_KEY = "churcherp:pwa-install-dismissed";
export const PWA_INSTALL_DISMISS_DURATION_MS = 24 * 60 * 60 * 1_000;

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

  if (promptEvent !== null) {
    isAppInstalled = false;
  }

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

  if (typeof window !== "undefined") {
    (window as WindowWithInstallPrompt).__churchErpInstallPrompt = null;
    clearPwaInstallDismissal();
  }

  notifyListeners();
}

export function markPwaNotInstalled() {
  isAppInstalled = false;
  notifyListeners();
}

export function clearPwaInstallDismissal() {
  window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
}

export function dismissPwaInstallPrompt() {
  window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(Date.now()));
}

export function isPwaInstallDismissed() {
  const storedValue = window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
  const dismissedAt = storedValue === null ? Number.NaN : Number(storedValue);

  if (
    !Number.isFinite(dismissedAt) ||
    Date.now() - dismissedAt >= PWA_INSTALL_DISMISS_DURATION_MS
  ) {
    clearPwaInstallDismissal();
    return false;
  }

  return true;
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

export async function detectInstalledPwa(): Promise<InstalledPwaDetection> {
  if (isRunningStandalone()) {
    return "installed";
  }

  const navigatorWithRelatedApps =
    window.navigator as NavigatorWithStandalone;

  if (!navigatorWithRelatedApps.getInstalledRelatedApps) {
    return "unsupported";
  }

  try {
    const relatedApps =
      await navigatorWithRelatedApps.getInstalledRelatedApps();

    return relatedApps.some((app) => app.platform === "webapp")
      ? "installed"
      : "not-installed";
  } catch {
    return "unsupported";
  }
}

export function waitForPwaInstallPrompt(
  timeoutMs = 2_000,
): Promise<BeforeInstallPromptEvent | null> {
  const existingPrompt = getPwaInstallState().deferredPrompt;

  if (existingPrompt !== null) {
    return Promise.resolve(existingPrompt);
  }

  return new Promise((resolve) => {
    const unsubscribe = subscribeToPwaInstall(() => {
      const promptEvent = getPwaInstallState().deferredPrompt;

      if (promptEvent !== null) {
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(promptEvent);
      }
    });
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
  });
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
