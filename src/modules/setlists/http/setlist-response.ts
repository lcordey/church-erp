import { authorizationBoundaryResponse } from "@/src/infrastructure/auth/require-admin";

import {
  SetlistItemNotFoundError,
  SetlistSongsNotPublishedError,
} from "../services/setlist-management";
import type { SetlistValidationErrors } from "../validation/setlist-input";

export function invalidSetlistResponse(fields: SetlistValidationErrors) {
  return Response.json(
    {
      error: {
        code: "INVALID_SETLIST",
        message: "La setlist est invalide.",
        fields,
      },
    },
    { status: 400 },
  );
}

export function setlistNotFoundResponse() {
  return Response.json(
    {
      error: {
        code: "SETLIST_NOT_FOUND",
        message: "Setlist introuvable.",
      },
    },
    { status: 404 },
  );
}

export function invalidSetlistNoteResponse(message: string) {
  return Response.json(
    { error: { code: "INVALID_SETLIST_NOTE", message } },
    { status: 400 },
  );
}

export function setlistErrorResponse(error: unknown) {
  const authorizationResponse = authorizationBoundaryResponse(error);
  if (authorizationResponse) return authorizationResponse;

  if (error instanceof SetlistSongsNotPublishedError) {
    return invalidSetlistResponse({
      songIds: "Une setlist ne peut contenir que des chants publiés.",
    });
  }

  if (error instanceof SetlistItemNotFoundError) return setlistNotFoundResponse();

  console.error(error);

  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Impossible d’enregistrer la setlist.",
      },
    },
    { status: 500 },
  );
}
