import { describe, expect, it } from "vitest";

import { apiRequestRequiresAuthentication } from "./api-access-policy";

describe("API access policy", () => {
  it.each([
    ["GET", "/api/songs"],
    ["GET", "/api/songs/"],
    ["GET", "/api/songs/chant-public"],
    ["GET", "/api/songs/chant-public/"],
    ["HEAD", "/api/songs/chant-public"],
    ["GET", "/api/setlists"],
    ["GET", "/api/setlists/setlist-id"],
    ["GET", "/api/events"],
    ["GET", "/api/events/event-id"],
    ["GET", "/api/push/config"],
    ["POST", "/api/auth/login"],
    ["POST", "/api/auth/logout"],
    ["OPTIONS", "/api/admin/songs"],
  ])("allows the unauthenticated entry point %s %s", (method, pathname) => {
    expect(apiRequestRequiresAuthentication(method, pathname)).toBe(false);
  });

  it.each([
    ["POST", "/api/songs"],
    ["POST", "/api/setlists"],
    ["PUT", "/api/setlists/setlist-id"],
    ["DELETE", "/api/events/event-id"],
    ["GET", "/api/admin/songs"],
    ["GET", "/api/admin/users"],
    ["GET", "/api/push/subscriptions"],
    ["GET", "/api/songs/chant-public/pdf"],
    ["GET", "/api/songs/chant-public/musicxml"],
    ["PATCH", "/api/new-route"],
  ])("protects %s %s by default", (method, pathname) => {
    expect(apiRequestRequiresAuthentication(method, pathname)).toBe(true);
  });

  it("does not apply the API policy to application pages", () => {
    expect(apiRequestRequiresAuthentication("GET", "/worship")).toBe(false);
  });
});
