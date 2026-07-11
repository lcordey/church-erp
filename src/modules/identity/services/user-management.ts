import { requirePermission } from "@/src/infrastructure/auth/require-admin";

import { hashPassword } from "../password";
import {
  createIdentityRepository,
  type IdentityRepository,
} from "../repositories/identity-repository";
import type { CreateUserInput, UpdateUserInput } from "../types/identity";

export class UsernameConflictError extends Error {}
export class UserNotFoundError extends Error {}
export class SelfAdministrationForbiddenError extends Error {}
export class LastAdministratorError extends Error {}

async function assertUsernameAvailable(
  username: string,
  repository: IdentityRepository,
  ignoredUserId?: string,
) {
  const existing = await repository.findAuthenticationUser(username);
  if (existing && existing.id !== ignoredUserId) throw new UsernameConflictError();
}

export async function listManagedUsers(
  repository: IdentityRepository = createIdentityRepository(),
) {
  await requirePermission("user.manage");
  return repository.listUsers();
}

export async function listAssignableUsers(
  repository: IdentityRepository = createIdentityRepository(),
) {
  await requirePermission("event.manage");
  return repository.listAssignableUsers();
}

export async function createManagedUser(
  input: CreateUserInput,
  repository: IdentityRepository = createIdentityRepository(),
) {
  await requirePermission("user.manage");
  await assertUsernameAvailable(input.username, repository);
  return repository.createUser(input, await hashPassword(input.temporaryPassword));
}

export async function updateManagedUser(
  id: string,
  input: UpdateUserInput,
  repository: IdentityRepository = createIdentityRepository(),
) {
  const actor = await requirePermission("user.manage");
  const target = await repository.findUserById(id);
  if (!target) throw new UserNotFoundError();
  await assertUsernameAvailable(input.username, repository, id);

  if (
    actor.id === id &&
    (input.status === "disabled" || !input.groupCodes.includes("admin"))
  ) {
    throw new SelfAdministrationForbiddenError();
  }

  const removesActiveAdmin =
    target.status === "active" &&
    target.groupCodes.includes("admin") &&
    (input.status === "disabled" || !input.groupCodes.includes("admin"));
  if (removesActiveAdmin && (await repository.countActiveAdmins(id)) === 0) {
    throw new LastAdministratorError();
  }

  const updated = await repository.updateUser(id, input);
  if (!updated) throw new UserNotFoundError();
  if (input.status === "disabled") await repository.deleteSessionsForUser(id);
  return updated;
}

export async function resetManagedUserPassword(
  id: string,
  temporaryPassword: string,
  repository: IdentityRepository = createIdentityRepository(),
) {
  const actor = await requirePermission("user.manage");
  if (actor.id === id) throw new SelfAdministrationForbiddenError();
  const target = await repository.findUserById(id);
  if (!target) throw new UserNotFoundError();
  await repository.updatePassword(id, await hashPassword(temporaryPassword));
  await repository.deleteSessionsForUser(id);
  // A reset is temporary even though a normal password update clears the flag.
  await repository.markPasswordChangeRequired(id);
}
