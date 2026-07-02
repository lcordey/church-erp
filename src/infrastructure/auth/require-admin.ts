import { cookies } from "next/headers";
import { cache } from "react";

import {
  authSessionCookieName,
  readAuthSessionFromCookieHeader,
  readAuthSessionToken,
  type AuthenticatedActor,
} from "./session";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
  }
}

export const getCurrentActor = cache(async (): Promise<AuthenticatedActor | null> => {
  const cookieStore = await cookies();

  return readAuthSessionToken(cookieStore.get(authSessionCookieName)?.value);
});

export async function requireAdminAccess(): Promise<AuthenticatedActor> {
  const actor = await getCurrentActor();

  if (!actor) {
    throw new AuthenticationRequiredError();
  }

  // MVP-1 treats every authenticated real user as an administrator.
  return actor;
}

export function getActorFromRequest(request: Request): AuthenticatedActor | null {
  return readAuthSessionFromCookieHeader(request.headers.get("cookie"));
}

export function requireAuthenticatedRequest(request: Request): AuthenticatedActor {
  const actor = getActorFromRequest(request);

  if (!actor) {
    throw new AuthenticationRequiredError();
  }

  return actor;
}

export function authenticationRequiredResponse() {
  return Response.json(
    {
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Connexion requise.",
      },
    },
    { status: 401 },
  );
}
