import { SongSlugConflictError } from "../repositories/admin-song-repository";
import {
  InvalidSongPdfError,
  PublishedSongDeletionError,
  ReadOnlySongError,
} from "../services/admin-song-management";
import type { AdminSongValidationErrors } from "../validation/admin-song-input";

export function invalidSongResponse(errors: AdminSongValidationErrors) {
  return Response.json(
    {
      error: {
        code: "INVALID_SONG",
        message: "Certains champs doivent être corrigés.",
        fields: errors,
      },
    },
    { status: 400 },
  );
}

export function songNotFoundResponse() {
  return Response.json(
    {
      error: {
        code: "SONG_NOT_FOUND",
        message: "Chant introuvable.",
      },
    },
    { status: 404 },
  );
}

export function adminSongErrorResponse(error: unknown) {
  if (error instanceof ReadOnlySongError) {
    return Response.json(
      {
        error: {
          code: "READ_ONLY_SONG",
          message:
            "Ce chant vient d’une source officielle et ne peut pas être modifié directement.",
        },
      },
      { status: 409 },
    );
  }

  if (error instanceof PublishedSongDeletionError) {
    return Response.json(
      {
        error: {
          code: "PUBLISHED_SONG_DELETE_FORBIDDEN",
          message:
            "Retire d’abord ce chant du catalogue avant de le supprimer.",
        },
      },
      { status: 409 },
    );
  }

  if (error instanceof InvalidSongPdfError) {
    return Response.json(
      {
        error: {
          code: "INVALID_PDF",
          message:
            "La partition doit être un fichier PDF valide de moins de 20 Mo.",
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof SongSlugConflictError) {
    return Response.json(
      {
        error: {
          code: "SLUG_CONFLICT",
          message: "Ce slug est déjà utilisé par un autre chant.",
          fields: {
            slug: "Choisis un slug unique.",
          },
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
