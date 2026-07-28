import { describe, expect, it, vi } from "vitest";

import type {
  AuthenticationUser,
  IdentityRepository,
} from "../repositories/identity-repository";
import { authenticateUser, InvalidCredentialsError } from "./authentication";

const user: AuthenticationUser = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "louange",
  displayName: "Louange",
  passwordHash: "scrypt$16384$8$1$UseNzejLzSi7aK70Nbqntw$B3QatI3q4J9cf0jC2zFqysWZud_0i1sGyA0Jqt9vabhlpGnyUxJEguWIxQ_WatdcqyH5sXLfSZS6WBhN2XAIHg",
  status: "active" as const,
  mustChangePassword: true,
  failedLoginCount: 0,
  groupCodes: ["worship"],
  lockedUntil: null,
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
};

function repository(overrides: Partial<IdentityRepository> = {}): IdentityRepository {
  return {
    findAuthenticationUser: vi.fn(async () => user),
    findUserById: vi.fn(async () => user),
    findActorBySessionTokenHash: vi.fn(async () => user),
    createSession: vi.fn(async () => undefined),
    deleteSession: vi.fn(async () => undefined),
    deleteSessionsForUser: vi.fn(async () => undefined),
    recordLoginFailure: vi.fn(async () => undefined),
    clearLoginFailures: vi.fn(async () => undefined),
    listUsers: vi.fn(async () => []),
    listAssignableUsers: vi.fn(async () => []),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    updatePassword: vi.fn(async () => undefined),
    replacePasswordHash: vi.fn(async () => undefined),
    markPasswordChangeRequired: vi.fn(async () => undefined),
    countActiveAdmins: vi.fn(async () => 1),
    ...overrides,
  };
}

describe("authentication service", () => {
  it("issues a revocable session with cumulative permissions", async () => {
    const identityRepository = repository();
    const result = await authenticateUser(
      { username: "LOUANGE", password: "louange" },
      identityRepository,
      new Date("2026-07-11T10:00:00Z"),
    );
    expect(result.actor).toMatchObject({ username: "louange", mustChangePassword: true });
    expect(result.actor.permissions).toContain("event.manage");
    expect(identityRepository.clearLoginFailures).toHaveBeenCalledWith(user.id);
    expect(identityRepository.replacePasswordHash).toHaveBeenCalledWith(
      user.id,
      expect.stringMatching(/^scrypt\$32768\$8\$3\$/),
    );
    expect(identityRepository.createSession).toHaveBeenCalledOnce();
  });

  it("locks the fifth consecutive failed login for fifteen minutes", async () => {
    const identityRepository = repository({
      findAuthenticationUser: vi.fn(async () => ({ ...user, failedLoginCount: 4 })),
    });
    await expect(
      authenticateUser(
        { username: "louange", password: "incorrect" },
        identityRepository,
        new Date("2026-07-11T10:00:00Z"),
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(identityRepository.recordLoginFailure).toHaveBeenCalledWith(
      user.id,
      5,
      new Date("2026-07-11T10:15:00Z"),
    );
  });

  it("requires an existing short password to be replaced after login", async () => {
    const identityRepository = repository({
      findAuthenticationUser: vi.fn(async () => ({
        ...user,
        mustChangePassword: false,
      })),
    });

    const result = await authenticateUser(
      { username: "louange", password: "louange" },
      identityRepository,
      new Date("2026-07-11T10:00:00Z"),
    );

    expect(result.actor.mustChangePassword).toBe(true);
    expect(identityRepository.markPasswordChangeRequired).toHaveBeenCalledWith(
      user.id,
    );
  });
});
