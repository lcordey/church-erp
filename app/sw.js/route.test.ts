import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("service worker route", () => {
  it("serves a versioned worker that can activate an explicit update", async () => {
    const response = GET();
    const source = await response.text();

    expect(response.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toContain("no-cache");
    expect(source).toContain("__CHURCH_ERP_VERSION__");
    expect(source).toContain('"SKIP_WAITING"');
    expect(source).toContain("self.skipWaiting()");
    expect(source).toContain('event.request.mode !== "navigate"');
    expect(source).toContain("event.respondWith(");
    expect(source).toContain("Connexion indisponible");
  });
});
