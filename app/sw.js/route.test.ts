import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("service worker route", () => {
  it("serves a minimal service worker for browser installability", async () => {
    const response = GET();
    const source = await response.text();

    expect(response.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(source).toContain("CHURCH_ERP_SW_VERSION");
    expect(source).toContain("CHURCH_ERP_SKIP_WAITING");
    expect(source).toContain("self.skipWaiting()");
    expect(source).toContain("self.clients.claim()");
    expect(source).toContain('self.addEventListener("fetch"');
    expect(source).toContain("event.respondWith(fetch(event.request))");
    expect(source).toContain('self.addEventListener("push"');
    expect(source).toContain("showNotification");
    expect(source).toContain('self.addEventListener("notificationclick"');
    expect(source).toContain("openWindow");
  });
});
