import {
  authenticationRequiredResponse,
  AuthenticationRequiredError,
} from "@/src/infrastructure/auth/require-admin";

import { SongTaxonomyNameConflictError } from "../repositories/song-taxonomy-repository";
import { InvalidSongTaxonomyNameError } from "../services/song-taxonomy-management";

export function songTaxonomyErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return authenticationRequiredResponse();
  }

  if (error instanceof InvalidSongTaxonomyNameError) {
    return Response.json(
      {
        error: {
          code: "INVALID_TAXONOMY_NAME",
          message: "Le nom est obligatoire et limité à 80 caractères.",
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof SongTaxonomyNameConflictError) {
    return Response.json(
      {
        error: {
          code: "TAXONOMY_NAME_CONFLICT",
          message: "Ce nom existe déjà dans cette liste.",
        },
      },
      { status: 409 },
    );
  }

  console.error(error);

  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Une erreur serveur est survenue.",
      },
    },
    { status: 500 },
  );
}
