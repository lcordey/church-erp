export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export type WindowWithInstallPrompt = Window & {
  __churchErpDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  __churchErpServiceWorkerRegistrationPromise?: Promise<ServiceWorkerRegistration | null>;
};

export const installPromptReadyEvent = "churcherpinstallpromptready";
export const installPromptConsumedEvent = "churcherpinstallpromptconsumed";
export const installBannerDismissedUntilKey =
  "churcherp:pwa-install-banner-dismissed-until";
export const installBannerDismissalDurationMs = 24 * 60 * 60 * 1000;

const legacyDismissKeys = [
  "churcherp:pwa-install-banner-dismissed",
  "churcherp:pwa-install-banner-dismissed-at",
];

export function getDeferredInstallPrompt() {
  return (
    (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt ?? null
  );
}

export function isPwaStandalone() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function clearLegacyInstallDismissals() {
  try {
    legacyDismissKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in private modes.
  }
}

export function readInstallBannerDismissedUntil() {
  try {
    return activeInstallBannerDismissal(
      window.localStorage.getItem(installBannerDismissedUntilKey),
    );
  } catch {
    return null;
  }
}

export function activeInstallBannerDismissal(
  storedValue: string | null,
  now = Date.now(),
) {
  const value = Number(storedValue);
  return Number.isFinite(value) && value > now ? value : null;
}

export function installBannerDismissedUntil(now = Date.now()) {
  return now + installBannerDismissalDurationMs;
}

export function dismissInstallBannerForOneDay() {
  const dismissedUntil = installBannerDismissedUntil();
  try {
    window.localStorage.setItem(
      installBannerDismissedUntilKey,
      String(dismissedUntil),
    );
  } catch {
    // The in-memory banner state still prevents immediate redisplay.
  }
  return dismissedUntil;
}

export function clearInstallBannerDismissal() {
  try {
    window.localStorage.removeItem(installBannerDismissedUntilKey);
  } catch {}
}

export async function promptPwaInstallation() {
  const promptEvent = getDeferredInstallPrompt();
  if (promptEvent === null || isPwaStandalone()) return null;

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  (window as WindowWithInstallPrompt).__churchErpDeferredInstallPrompt = null;
  window.dispatchEvent(new Event(installPromptConsumedEvent));
  return choice.outcome;
}
