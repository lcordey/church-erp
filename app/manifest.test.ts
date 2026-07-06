import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  it("declares ChurchERP as its own related web app", () => {
    const webManifest = manifest();

    expect(webManifest.id).toBe("/");
    expect(webManifest.related_applications).toContainEqual({
      platform: "webapp",
      url: "/manifest.webmanifest",
      id: "/",
    });
  });
});
