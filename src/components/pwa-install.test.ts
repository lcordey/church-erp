import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismissPwaInstallPrompt,
  isPwaInstallDismissed,
  PWA_INSTALL_DISMISS_DURATION_MS,
  PWA_INSTALL_DISMISS_KEY,
} from "./pwa-install";

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
});
