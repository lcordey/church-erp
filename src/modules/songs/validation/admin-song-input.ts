import type { AdminSongInput } from "../types/admin-song";
import { isMusicalKey } from "../music/musical-key";

export type AdminSongField =
  | "title"
  | "slug"
  | "author"
  | "copyright"
  | "defaultKey"
  | "chordProContent";

export type AdminSongValidationErrors = Partial<
  Record<AdminSongField, string>
>;

export type AdminSongValidationResult =
  | { success: true; data: AdminSongInput }
  | { success: false; errors: AdminSongValidationErrors };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const chordTokenPattern = /\[([^\]\r\n]+)\]/g;
const frenchChordRootPattern =
  /^(do|re|ré|mi|fa|sol|la|si)(?:[^a-zA-ZÀ-ÿ]|$)/i;
const supportedChordPartPattern = /^[A-G][#b]?[a-zA-Z0-9#b()+-]*$/;
const supportedChordCharacterPattern = /^[A-Za-z0-9#b()+-]$/;

type InvalidChord = {
  chord: string;
  symbol: string;
};

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function findFrenchChordRoot(part: string): string | null {
  const match = part.match(/^(do|re|ré|mi|fa|sol|la|si)/i);
  return match?.[1] ?? null;
}

function findInvalidChordSymbol(part: string): string {
  const frenchRoot = findFrenchChordRoot(part);

  if (frenchRoot) {
    return frenchRoot;
  }

  if (!/^[A-G]/.test(part)) {
    return part[0] ?? part;
  }

  for (const character of part) {
    if (!supportedChordCharacterPattern.test(character)) {
      return character;
    }
  }

  return part;
}

function findInvalidChord(content: string): InvalidChord | null {
  for (const match of content.matchAll(chordTokenPattern)) {
    const chord = match[1].trim();

    if (!chord) {
      return { chord: match[1], symbol: "accord vide" };
    }

    const parts = chord.split("/");

    for (const part of parts) {
      if (
        !part ||
        frenchChordRootPattern.test(part) ||
        !supportedChordPartPattern.test(part)
      ) {
        return {
          chord,
          symbol: findInvalidChordSymbol(part),
        };
      }
    }
  }

  return null;
}

export function validateAdminSongInput(
  input: unknown,
): AdminSongValidationResult {
  if (!input || typeof input !== "object") {
    return {
      success: false,
      errors: { title: "Les données du chant sont invalides." },
    };
  }

  const values = input as Record<string, unknown>;
  const title = typeof values.title === "string" ? values.title.trim() : "";
  const slug =
    typeof values.slug === "string" ? values.slug.trim().toLowerCase() : "";
  const chordProContent =
    typeof values.chordProContent === "string"
      ? values.chordProContent.trim()
      : "";
  const defaultKey = optionalText(values.defaultKey);
  const errors: AdminSongValidationErrors = {};

  if (!title) {
    errors.title = "Le titre est obligatoire.";
  } else if (title.length > 180) {
    errors.title = "Le titre ne peut pas dépasser 180 caractères.";
  }

  if (!slug) {
    errors.slug = "Le slug est obligatoire.";
  } else if (!slugPattern.test(slug)) {
    errors.slug =
      "Utilise uniquement des lettres minuscules, chiffres et tirets.";
  }

  if (!chordProContent) {
    errors.chordProContent = "Le contenu ChordPro est obligatoire.";
  } else {
    const invalidChord = findInvalidChord(chordProContent);

    if (invalidChord) {
      errors.chordProContent =
        `Symbole incorrect : "${invalidChord.symbol}" dans [${invalidChord.chord}]. ` +
        "Utilise uniquement des accords en notation anglaise commençant par " +
        "A, B, C, D, E, F ou G.";
    }
  }

  if (defaultKey && !isMusicalKey(defaultKey)) {
    errors.defaultKey = "Choisis une tonalité dans la liste.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      title,
      slug,
      author: optionalText(values.author),
      copyright: optionalText(values.copyright),
      defaultKey,
      chordProContent,
    },
  };
}
