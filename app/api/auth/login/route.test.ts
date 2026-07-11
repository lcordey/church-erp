import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateUser, MockInvalidCredentialsError } = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  MockInvalidCredentialsError: class extends Error {},
}));

vi.mock("@/src/modules/identity/services/authentication", () => ({
  authenticateUser,
  InvalidCredentialsError: MockInvalidCredentialsError,
}));

vi.mock("@/src/infrastructure/auth/session", () => ({
  authSessionCookie: (token: string) =>
    `churcherp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
}));

import { POST } from "./route";

function createLoginRequest(redirectTo: string) {
  const body = new FormData();
  body.set("username", "louange");
  body.set("password", "secret");
  body.set("redirectTo", redirectTo);
  return new Request("http://localhost/api/auth/login", { body, method: "POST" });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    authenticateUser.mockReset();
    authenticateUser.mockResolvedValue({
      actor: {
        id: "user-id",
        username: "louange",
        displayName: "Louange",
        groupCodes: ["worship"],
        permissions: ["song.manage"],
        mustChangePassword: false,
      },
      token: "session-token",
    });
  });

  it("returns to the protected destination after login", async () => {
    const response = await POST(createLoginRequest("/chants/chant-publie?mode=edition"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/chants/chant-publie?mode=edition");
    expect(response.headers.get("set-cookie")).toContain("churcherp_session=session-token");
  });

  it("rejects an external redirect destination", async () => {
    const response = await POST(createLoginRequest("//example.com/unauthorized"));
    expect(response.headers.get("location")).toBe("/worship");
  });

  it("redirects temporary-password users to the password change", async () => {
    authenticateUser.mockResolvedValueOnce({
      actor: { mustChangePassword: true },
      token: "session-token",
    });
    const response = await POST(createLoginRequest("/events"));
    expect(response.headers.get("location")).toBe("/password-change?redirectTo=%2Fevents");
  });

  it("keeps the destination after invalid credentials", async () => {
    authenticateUser.mockRejectedValueOnce(new MockInvalidCredentialsError());
    const response = await POST(createLoginRequest("/setlist/setlist-id"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?error=1&redirectTo=%2Fsetlist%2Fsetlist-id");
  });
});
