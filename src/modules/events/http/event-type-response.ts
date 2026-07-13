import { authorizationBoundaryResponse } from "@/src/infrastructure/auth/require-admin";
import { EventTypeNameConflictError } from "../repositories/event-type-repository";
import { InvalidEventTypeNameError } from "../services/event-type-management";

export function eventTypeErrorResponse(error: unknown) {
  const authorizationResponse = authorizationBoundaryResponse(error);
  if (authorizationResponse) return authorizationResponse;
  if (error instanceof InvalidEventTypeNameError) return Response.json({ error: { code: "INVALID_EVENT_TYPE_NAME", message: "Le nom est obligatoire et limité à 80 caractères." } }, { status: 400 });
  if (error instanceof EventTypeNameConflictError) return Response.json({ error: { code: "EVENT_TYPE_NAME_CONFLICT", message: "Ce type d’événement existe déjà." } }, { status: 409 });
  console.error(error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Une erreur serveur est survenue." } }, { status: 500 });
}
