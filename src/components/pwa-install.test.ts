import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismissPwaInstallPrompt,
  getAvailableInstallPrompt,
  getPwaInstallState,
  isPwaInstallDismissed,
  PWA_INSTALL_DISMISS_DURATION_MS,
  PWA_INSTALL_DISMISS_KEY,
  rememberDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "./pwa-install";

type WindowWithInstallPrompt = Window & {
  __churchErpInstallPrompt?: BeforeInstallPromptEvent | null;
};

describe("PWA install dismissal", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00Z"));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("allows the banner again 24 hours after choosing later", () => {
    dismissPwaInstallPrompt();

    expect(isPwaInstallDismissed()).toBe(true);

    vi.advanceTimersByTime(PWA_INSTALL_DISMISS_DURATION_MS);

    expect(isPwaInstallDismissed()).toBe(false);
    expect(storage.has(PWA_INSTALL_DISMISS_KEY)).toBe(false);
  });

  it("forgets the previous non-expiring dismissal value", () => {
    storage.set(PWA_INSTALL_DISMISS_KEY, "true");

    expect(isPwaInstallDismissed()).toBe(false);
    expect(storage.has(PWA_INSTALL_DISMISS_KEY)).toBe(false);
  });

  it("uses the prompt captured before React hydration", () => {
    const promptEvent = new Event(
      "beforeinstallprompt",
    ) as BeforeInstallPromptEvent;

    (window as WindowWithInstallPrompt).__churchErpInstallPrompt = promptEvent;

    expect(getAvailableInstallPrompt()).toBe(promptEvent);
    expect(getPwaInstallState().deferredPrompt).toBe(promptEvent);
  });

  it("returns null when no prompt has been captured", () => {
    rememberDeferredInstallPrompt(null);
    (window as WindowWithInstallPrompt).__churchErpInstallPrompt = null;

    expect(getAvailableInstallPrompt()).toBeNull();
  });
});
