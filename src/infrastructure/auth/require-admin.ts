import { cookies } from "next/headers";
import { cache } from "react";

import { hasPermission } from "@/src/modules/identity/permissions";
import { loadActorFromSessionToken } from "@/src/modules/identity/services/authentication";
import type {
  AuthenticatedActor,
  Permission,
} from "@/src/modules/identity/types/identity";

import {
  authSessionCookieName,
  readAuthSessionTokenFromCookieHeader,
} from "./session";

export type { AuthenticatedActor } from "@/src/modules/identity/types/identity";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
  }
}

export class AuthorizationForbiddenError extends Error {
  constructor() {
    super("Permission is required.");
  }
}

export class PasswordChangeRequiredError extends Error {
  constructor() {
    super("Password change is required.");
  }
}

export const getCurrentActor = cache(async (): Promise<AuthenticatedActor | null> => {
  const cookieStore = await cookies();
  return loadActorFromSessionToken(cookieStore.get(authSessionCookieName)?.value);
});

function assertUsableActor(actor: AuthenticatedActor | null) {
  if (!actor) throw new AuthenticationRequiredError();
  if (actor.mustChangePassword) throw new PasswordChangeRequiredError();
  return actor;
}

export async function requireAuthenticatedActor() {
  return assertUsableActor(await getCurrentActor());
}

export async function requirePermission(permission: Permission) {
  const actor = await requireAuthenticatedActor();
  if (!hasPermission(actor.permissions, permission)) {
    throw new AuthorizationForbiddenError();
  }
  return actor;
}

export async function getActorFromRequest(request: Request) {
  return loadActorFromSessionToken(
    readAuthSessionTokenFromCookieHeader(request.headers.get("cookie")),
  );
}

export async function requireAuthenticatedRequest(request: Request) {
  return assertUsableActor(await getActorFromRequest(request));
}

export async function requireRequestPermission(request: Request, permission: Permission) {
  const actor = await requireAuthenticatedRequest(request);
  if (!hasPermission(actor.permissions, permission)) {
    throw new AuthorizationForbiddenError();
  }
  return actor;
}

export function authenticationRequiredResponse() {
  return Response.json(
    { error: { code: "AUTHENTICATION_REQUIRED", message: "Connexion requise." } },
    { status: 401 },
  );
}

export function authorizationForbiddenResponse() {
  return Response.json(
    { error: { code: "FORBIDDEN", message: "Tu n’as pas l’autorisation nécessaire." } },
    { status: 403 },
  );
}

export function passwordChangeRequiredResponse() {
  return Response.json(
    {
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change ton mot de passe avant de continuer.",
      },
    },
    { status: 403 },
  );
}

export function authorizationBoundaryResponse(error: unknown): Response | null {
  if (error instanceof AuthenticationRequiredError) return authenticationRequiredResponse();
  if (error instanceof PasswordChangeRequiredError) return passwordChangeRequiredResponse();
  if (error instanceof AuthorizationForbiddenError) return authorizationForbiddenResponse();
  return null;
}
