import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAuthSessionToken, verifyLoginPassword } = vi.hoisted(() => ({
  createAuthSessionToken: vi.fn(() => "session-token"),
  verifyLoginPassword: vi.fn(() => true),
}));

vi.mock("@/src/infrastructure/auth/session", () => ({
  authSessionCookieName: "churcherp_session",
  authSessionMaxAge: () => 3600,
  createAuthSessionToken,
  verifyLoginPassword,
}));

import { POST } from "./route";

function createLoginRequest(redirectTo: string) {
  const body = new FormData();
  body.set("password", "secret");
  body.set("redirectTo", redirectTo);

  return new Request("http://localhost/api/auth/login", {
    body,
    method: "POST",
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    createAuthSessionToken.mockClear();
    verifyLoginPassword.mockReset();
    verifyLoginPassword.mockReturnValue(true);
  });

  it("returns to the protected destination after login", async () => {
    const response = await POST(
      createLoginRequest("/chants/chant-publie?mode=edition"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/chants/chant-publie?mode=edition",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "churcherp_session=session-token",
    );
  });

  it("rejects an external redirect destination", async () => {
    const response = await POST(
      createLoginRequest("//example.com/unauthorized"),
    );

    expect(response.headers.get("location")).toBe("/worship");
  });

  it("keeps the destination after an invalid password", async () => {
    verifyLoginPassword.mockReturnValue(false);

    const response = await POST(
      createLoginRequest("/setlist/setlist-id"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/login?error=1&redirectTo=%2Fsetlist%2Fsetlist-id",
    );
  });
});
