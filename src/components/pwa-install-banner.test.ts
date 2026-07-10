import { describe, expect, it } from "vitest";

import { isInstallDismissalActive } from "./pwa-install-banner";

describe("PWA install banner dismissal", () => {
  it("keeps a recent dismissal active", () => {
    const now = Date.UTC(2026, 6, 10, 12);
    const dismissedAt = String(now - 2 * 24 * 60 * 60 * 1000);

    expect(isInstallDismissalActive(dismissedAt, now)).toBe(true);
  });

  it("expires an old dismissal", () => {
    const now = Date.UTC(2026, 6, 10, 12);
    const dismissedAt = String(now - 8 * 24 * 60 * 60 * 1000);

    expect(isInstallDismissalActive(dismissedAt, now)).toBe(false);
  });

  it("ignores invalid dismissal values", () => {
    expect(isInstallDismissalActive("dismissed")).toBe(false);
    expect(isInstallDismissalActive(null)).toBe(false);
  });
});
