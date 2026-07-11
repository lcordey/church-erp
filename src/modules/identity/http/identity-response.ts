import { authorizationBoundaryResponse } from "@/src/infrastructure/auth/require-admin";

import {
  LastAdministratorError,
  SelfAdministrationForbiddenError,
  UserNotFoundError,
  UsernameConflictError,
} from "../services/user-management";

export function invalidIdentityResponse(fields: Record<string, string>) {
  return Response.json(
    { error: { code: "INVALID_IDENTITY_INPUT", message: "Certains champs doivent être corrigés.", fields } },
    { status: 400 },
  );
}

export function identityErrorResponse(error: unknown) {
  const authorizationResponse = authorizationBoundaryResponse(error);
  if (authorizationResponse) return authorizationResponse;
  if (error instanceof UserNotFoundError) {
    return Response.json({ error: { code: "USER_NOT_FOUND", message: "Compte introuvable." } }, { status: 404 });
  }
  if (error instanceof UsernameConflictError) {
    return Response.json({ error: { code: "USERNAME_CONFLICT", message: "Cet identifiant est déjà utilisé.", fields: { username: "Choisis un autre identifiant." } } }, { status: 409 });
  }
  if (error instanceof SelfAdministrationForbiddenError) {
    return Response.json({ error: { code: "SELF_ADMINISTRATION_FORBIDDEN", message: "Cette opération n’est pas autorisée sur ton propre compte." } }, { status: 409 });
  }
  if (error instanceof LastAdministratorError) {
    return Response.json({ error: { code: "LAST_ADMINISTRATOR", message: "Au moins un administrateur actif doit être conservé." } }, { status: 409 });
  }
  console.error(error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Impossible de gérer ce compte." } }, { status: 500 });
}
