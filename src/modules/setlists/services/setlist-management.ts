import { requireAdminAccess } from "@/src/infrastructure/auth/require-admin";

import {
  createSetlistRepository,
  type SetlistRepository,
} from "../repositories/setlist-repository";
import type { SetlistDetail, SetlistInput, SetlistSummary } from "../types/setlist";

export class SetlistSongsNotPublishedError extends Error {
  constructor() {
    super("Setlists can only include published songs.");
  }
}

function normalizeInput(input: SetlistInput): SetlistInput {
  return {
    title: input.title.trim(),
    songIds: input.songIds,
  };
}

async function assertPublishedSongs(
  songIds: string[],
  repository: SetlistRepository,
) {
  const uniqueSongIds = Array.from(new Set(songIds));
  const publishedSongIds = await repository.listPublishedSongIds(uniqueSongIds);

  if (uniqueSongIds.some((songId) => !publishedSongIds.has(songId))) {
    throw new SetlistSongsNotPublishedError();
  }
}

export async function listSetlists(
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistSummary[]> {
  await requireAdminAccess();
  return repository.listAll();
}

export async function getSetlist(
  id: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistDetail | null> {
  await requireAdminAccess();
  return repository.findById(id);
}

export async function createSetlist(
  input: SetlistInput,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistDetail> {
  await requireAdminAccess();
  const normalizedInput = normalizeInput(input);
  await assertPublishedSongs(normalizedInput.songIds, repository);

  return repository.create(normalizedInput);
}

export async function updateSetlist(
  id: string,
  input: SetlistInput,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistDetail | null> {
  await requireAdminAccess();
  const normalizedInput = normalizeInput(input);
  await assertPublishedSongs(normalizedInput.songIds, repository);

  return repository.update(id, normalizedInput);
}

export async function deleteSetlist(
  id: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<boolean> {
  await requireAdminAccess();
  return repository.delete(id);
}
