import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("security proxy", () => {
  it("rejects cross-site API mutations", async () => {
    const response = proxy(
      new NextRequest("https://church.example/api/auth/login", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CROSS_SITE_REQUEST_FORBIDDEN" },
    });
  });

  it("allows the login entry point without a session", () => {
    const response = proxy(
      new NextRequest("https://church.example/api/auth/login", {
        method: "POST",
        headers: {
          origin: "https://church.example",
          "sec-fetch-site": "same-origin",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects anonymous API mutations before route handling", async () => {
    const response = proxy(
      new NextRequest("https://church.example/api/events", {
        method: "POST",
        headers: {
          origin: "https://church.example",
          "sec-fetch-site": "same-origin",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
  });

  it("rejects anonymous private reads", async () => {
    const response = proxy(
      new NextRequest("https://church.example/api/admin/songs"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
  });

  it("allows explicitly public reads without a session", () => {
    const response = proxy(
      new NextRequest("https://church.example/api/songs/chant-public"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows private requests with a session cookie to reach authorization", () => {
    const response = proxy(
      new NextRequest("https://church.example/api/admin/songs", {
        headers: { cookie: "churcherp_session=session-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects oversized API bodies before parsing", async () => {
    const response = proxy(
      new NextRequest("https://church.example/api/auth/login", {
        method: "POST",
        headers: {
          "content-length": String(300 * 1024),
          origin: "https://church.example",
        },
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "REQUEST_TOO_LARGE" },
    });
  });

  it("adds a nonce-based content security policy to pages", () => {
    const response = proxy(new NextRequest("https://church.example/worship"));
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain("default-src 'self'");
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });
});
