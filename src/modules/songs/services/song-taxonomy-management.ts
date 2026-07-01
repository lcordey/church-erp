import { requireAdminAccess } from "@/src/infrastructure/auth/require-admin";

import {
  createSongTaxonomyRepository,
  type SongTaxonomyRepository,
} from "../repositories/song-taxonomy-repository";
import type {
  SongTaxonomies,
  SongTaxonomyItem,
  SongTaxonomyKind,
} from "../types/song-taxonomy";

export class InvalidSongTaxonomyNameError extends Error {
  constructor() {
    super("The taxonomy name is invalid.");
  }
}

function normalizeName(name: unknown): string {
  if (typeof name !== "string") {
    throw new InvalidSongTaxonomyNameError();
  }

  const normalized = name.trim().replace(/\s+/g, " ");

  if (!normalized || normalized.length > 80) {
    throw new InvalidSongTaxonomyNameError();
  }

  return normalized;
}

export function parseSongTaxonomyKind(value: string): SongTaxonomyKind | null {
  if (value === "themes") {
    return "theme";
  }

  if (value === "labels") {
    return "label";
  }

  return null;
}

export async function listAdminSongTaxonomies(
  repository: SongTaxonomyRepository = createSongTaxonomyRepository(),
): Promise<SongTaxonomies> {
  await requireAdminAccess();
  return repository.listAll();
}

export async function createSongTaxonomyItem(
  kind: SongTaxonomyKind,
  name: unknown,
  repository: SongTaxonomyRepository = createSongTaxonomyRepository(),
): Promise<SongTaxonomyItem> {
  await requireAdminAccess();
  return repository.create(kind, normalizeName(name));
}

export async function deleteSongTaxonomyItem(
  kind: SongTaxonomyKind,
  id: string,
  repository: SongTaxonomyRepository = createSongTaxonomyRepository(),
): Promise<boolean> {
  await requireAdminAccess();
  return repository.delete(kind, id);
}
