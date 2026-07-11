import { describe, expect, it } from "vitest";

import {
  activeInstallBannerDismissal,
  installBannerDismissalDurationMs,
  installBannerDismissedUntil,
} from "./pwa-install";

describe("PWA install banner dismissal", () => {
  it("hides the banner for exactly one day", () => {
    const now = Date.UTC(2026, 6, 11, 12);
    const dismissedUntil = installBannerDismissedUntil(now);

    expect(dismissedUntil).toBe(now + installBannerDismissalDurationMs);
    expect(activeInstallBannerDismissal(String(dismissedUntil), now)).toBe(
      dismissedUntil,
    );
    expect(
      activeInstallBannerDismissal(String(dismissedUntil), dismissedUntil),
    ).toBeNull();
  });

  it("ignores missing and invalid stored values", () => {
    expect(activeInstallBannerDismissal(null, 1)).toBeNull();
    expect(activeInstallBannerDismissal("invalid", 1)).toBeNull();
  });
});
