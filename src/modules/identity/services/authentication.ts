import {
  authSessionExpiresAt,
  createAuthSessionToken,
  hashAuthSessionToken,
} from "@/src/infrastructure/auth/session";

import { resolvePermissions } from "../permissions";
import {
  hashPassword,
  passwordHashNeedsUpgrade,
  verifyPassword,
} from "../password";
import {
  createIdentityRepository,
  type IdentityRepository,
} from "../repositories/identity-repository";
import type {
  AuthenticatedActor,
  ChangePasswordInput,
  LoginInput,
} from "../types/identity";
import { isPasswordPolicyCompliant } from "../validation/identity-input";

const dummyPasswordHash =
  "scrypt$32768$8$3$fQZVOivJTf-GO4yuOEcipg$tlaL4QsSZn6EUptWKaoqBzBVQj9PE9q0Zt0M7JckbYQ9oItt38t275f9sbzDAbt_LOpIbBvwAxxGHNXzk4X2uw";
const maximumFailedLogins = 5;
const lockDurationMs = 15 * 60 * 1000;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials.");
  }
}

export class CurrentPasswordInvalidError extends Error {
  constructor() {
    super("Current password is invalid.");
  }
}

function toActor(user: Awaited<ReturnType<IdentityRepository["findUserById"]>>): AuthenticatedActor | null {
  if (!user || user.status !== "active") return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    groupCodes: user.groupCodes,
    permissions: resolvePermissions(user.groupCodes),
    mustChangePassword: user.mustChangePassword,
  };
}

async function issueSession(userId: string, repository: IdentityRepository, now: Date) {
  const token = createAuthSessionToken();
  await repository.createSession(
    userId,
    hashAuthSessionToken(token),
    authSessionExpiresAt(now.getTime()),
  );
  return token;
}

export async function authenticateUser(
  input: LoginInput,
  repository: IdentityRepository = createIdentityRepository(),
  now = new Date(),
): Promise<{ actor: AuthenticatedActor; token: string }> {
  const user = await repository.findAuthenticationUser(input.username);
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? dummyPasswordHash,
  );
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > now);

  if (!user || user.status !== "active" || locked || !passwordMatches) {
    if (user && user.status === "active" && !locked && !passwordMatches) {
      await repository.recordLoginFailure(
        user.id,
        maximumFailedLogins,
        new Date(now.getTime() + lockDurationMs),
      );
    }
    throw new InvalidCredentialsError();
  }

  await repository.clearLoginFailures(user.id);
  if (passwordHashNeedsUpgrade(user.passwordHash)) {
    await repository.replacePasswordHash(
      user.id,
      await hashPassword(input.password),
    );
  }
  const requiresPasswordChange =
    user.mustChangePassword || !isPasswordPolicyCompliant(input.password);

  if (requiresPasswordChange && !user.mustChangePassword) {
    await repository.markPasswordChangeRequired(user.id);
  }

  const actor = toActor({
    ...user,
    mustChangePassword: requiresPasswordChange,
  });
  if (!actor) throw new InvalidCredentialsError();
  return { actor, token: await issueSession(user.id, repository, now) };
}

export async function loadActorFromSessionToken(
  token: string | null | undefined,
  repository: IdentityRepository = createIdentityRepository(),
  now = new Date(),
): Promise<AuthenticatedActor | null> {
  if (!token) return null;
  return toActor(await repository.findActorBySessionTokenHash(hashAuthSessionToken(token), now));
}

export async function revokeSession(
  token: string | null | undefined,
  repository: IdentityRepository = createIdentityRepository(),
) {
  if (token) await repository.deleteSession(hashAuthSessionToken(token));
}

export async function changePassword(
  actor: AuthenticatedActor,
  input: ChangePasswordInput,
  repository: IdentityRepository = createIdentityRepository(),
  now = new Date(),
) {
  const user = await repository.findUserById(actor.id);
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new CurrentPasswordInvalidError();
  }
  await repository.updatePassword(actor.id, await hashPassword(input.newPassword));
  await repository.deleteSessionsForUser(actor.id);
  return issueSession(actor.id, repository, now);
}
