import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  it("declares the minimal installable shell", () => {
    const webManifest = manifest();

    expect(webManifest.start_url).toBe("/worship");
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.icons).toContainEqual({
      src: "/icons/churcherp-192.png",
      sizes: "192x192",
      type: "image/png",
    });
    expect(webManifest.icons).toContainEqual({
      src: "/icons/churcherp-512.png",
      sizes: "512x512",
      type: "image/png",
    });
  });
});
