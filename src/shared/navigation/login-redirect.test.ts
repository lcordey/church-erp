import { describe, expect, it } from "vitest";

import { getLoginHref, getSafeRedirectPath } from "./login-redirect";

describe("login redirects", () => {
  it("preserves a local destination including its query string", () => {
    const destination = "/chants/chant-publie?mode=edition";

    expect(getLoginHref(destination)).toBe(
      "/login?redirectTo=%2Fchants%2Fchant-publie%3Fmode%3Dedition",
    );
    expect(getSafeRedirectPath(destination)).toBe(destination);
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(getSafeRedirectPath("https://example.com")).toBe("/worship");
    expect(getSafeRedirectPath("//example.com")).toBe("/worship");
    expect(getSafeRedirectPath("/\\example.com")).toBe("/worship");
  });
});
