import {
  authSessionExpiresAt,
  createAuthSessionToken,
  hashAuthSessionToken,
} from "@/src/infrastructure/auth/session";

import { resolvePermissions } from "../permissions";
import { hashPassword, verifyPassword } from "../password";
import {
  createIdentityRepository,
  type IdentityRepository,
} from "../repositories/identity-repository";
import type {
  AuthenticatedActor,
  ChangePasswordInput,
  LoginInput,
} from "../types/identity";

const dummyPasswordHash =
  "scrypt$16384$8$1$tsEmePJfvpwLjFz7QtVfkw$sWVrxw9n0Dbu5eZwc2OBNvTiz-Dop5Ow5Gkd41p6CSOXDzidNz6VSxOJI1CY94Kfnjboa9R95LI885exV49TXw";
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
      const failedLoginCount = user.failedLoginCount + 1;
      await repository.recordLoginFailure(
        user.id,
        failedLoginCount,
        failedLoginCount >= maximumFailedLogins
          ? new Date(now.getTime() + lockDurationMs)
          : null,
      );
    }
    throw new InvalidCredentialsError();
  }

  await repository.clearLoginFailures(user.id);
  const actor = toActor(user);
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
