import {
  authenticationRequiredResponse,
  AuthenticationRequiredError,
} from "@/src/infrastructure/auth/require-admin";

import {
  InvalidSongTaxonomySelectionError,
  SongSlugConflictError,
} from "../repositories/admin-song-repository";
import {
  InvalidSongMusicXmlError,
  InvalidSongPdfError,
  MissingSongMusicXmlError,
  PublishedSongDeletionError,
  RestrictedSongMetadataEditError,
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
  if (error instanceof AuthenticationRequiredError) {
    return authenticationRequiredResponse();
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

  if (error instanceof InvalidSongMusicXmlError) {
    return Response.json(
      {
        error: {
          code: "INVALID_MUSICXML",
          message:
            "La partition doit être un fichier MusicXML valide de moins de 5 Mo.",
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof MissingSongMusicXmlError) {
    return Response.json(
      {
        error: {
          code: "MISSING_MUSICXML",
          message:
            "Ajoute d’abord une partition MusicXML avant de générer le ChordPro.",
        },
      },
      { status: 409 },
    );
  }

  if (error instanceof RestrictedSongMetadataEditError) {
    return Response.json(
      {
        error: {
          code: "RESTRICTED_SONG_METADATA",
          message:
            "Les informations de provenance d’un chant officiel ne peuvent pas être modifiées.",
          fields: error.fields,
        },
      },
      { status: 409 },
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

  if (error instanceof InvalidSongTaxonomySelectionError) {
    return Response.json(
      {
        error: {
          code: "INVALID_SONG_TAXONOMY",
          message: "Un thème ou un label sélectionné n’existe plus.",
        },
      },
      { status: 400 },
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
