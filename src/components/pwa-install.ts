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
};

export type InstallPlatform = "ios" | "android" | "other-mobile" | "desktop";

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
  notifyListeners();
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
