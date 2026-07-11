import { authorizationBoundaryResponse } from "@/src/infrastructure/auth/require-admin";

import { EventAssigneeInvalidError, EventSetlistNotFoundError } from "../services/event-management";

export function invalidEventResponse(fields: Record<string, string>) {
  return Response.json({ error: { code: "INVALID_EVENT", message: "Certains champs doivent être corrigés.", fields } }, { status: 400 });
}
export function eventNotFoundResponse() {
  return Response.json({ error: { code: "EVENT_NOT_FOUND", message: "Événement introuvable." } }, { status: 404 });
}
export function eventErrorResponse(error: unknown) {
  const authorizationResponse = authorizationBoundaryResponse(error);
  if (authorizationResponse) return authorizationResponse;
  if (error instanceof EventSetlistNotFoundError) return invalidEventResponse({ setlistId: "La setlist sélectionnée n’existe plus." });
  if (error instanceof EventAssigneeInvalidError) return invalidEventResponse({ assignments: "Une personne sélectionnée n’est plus disponible." });
  console.error(error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Impossible d’enregistrer l’événement." } }, { status: 500 });
}
