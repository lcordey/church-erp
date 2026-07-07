import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("service worker route", () => {
  it("serves a minimal service worker for browser installability", async () => {
    const response = GET();
    const source = await response.text();

    expect(response.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(source).toContain("self.clients.claim()");
    expect(source).toContain('self.addEventListener("fetch"');
  });
});
