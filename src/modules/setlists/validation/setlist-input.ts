import type { SetlistInput } from "../types/setlist";

export type SetlistField = "title" | "songIds";

export type SetlistValidationErrors = Partial<Record<SetlistField, string>>;

export type SetlistValidationResult =
  | { success: true; data: SetlistInput }
  | { success: false; errors: SetlistValidationErrors };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateSetlistInput(
  input: unknown,
): SetlistValidationResult {
  if (!input || typeof input !== "object") {
    return {
      success: false,
      errors: { title: "Les données de la setlist sont invalides." },
    };
  }

  const values = input as Record<string, unknown>;
  const title = typeof values.title === "string" ? values.title.trim() : "";
  const rawSongIds = Array.isArray(values.songIds) ? values.songIds : [];
  const songIds = rawSongIds.filter(
    (value): value is string => typeof value === "string",
  );
  const errors: SetlistValidationErrors = {};

  if (!title) {
    errors.title = "Le titre est obligatoire.";
  } else if (title.length > 160) {
    errors.title = "Le titre ne peut pas dépasser 160 caractères.";
  }

  if (rawSongIds.length !== songIds.length || songIds.some((id) => !uuidPattern.test(id))) {
    errors.songIds = "La liste des chants est invalide.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: { title, songIds } };
}
