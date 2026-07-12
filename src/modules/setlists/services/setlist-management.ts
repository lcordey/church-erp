import { requirePermission } from "@/src/infrastructure/auth/require-admin";

import {
  createSetlistRepository,
  type SetlistRepository,
} from "../repositories/setlist-repository";
import type {
  SetlistDetail,
  SetlistInput,
  SetlistItemNotes,
  SetlistSummary,
  SetlistTeamNote,
} from "../types/setlist";

export class SetlistSongsNotPublishedError extends Error {
  constructor() {
    super("Setlists can only include published songs.");
  }
}

export class SetlistItemNotFoundError extends Error {
  constructor() {
    super("Setlist item was not found.");
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
  return repository.listAll();
}

export async function getSetlist(
  id: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistDetail | null> {
  return repository.findById(id);
}

export async function createSetlist(
  input: SetlistInput,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistDetail> {
  await requirePermission("setlist.manage");
  const normalizedInput = normalizeInput(input);
  await assertPublishedSongs(normalizedInput.songIds, repository);

  return repository.create(normalizedInput);
}

export async function updateSetlist(
  id: string,
  input: SetlistInput,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistDetail | null> {
  await requirePermission("setlist.manage");
  const normalizedInput = normalizeInput(input);
  await assertPublishedSongs(normalizedInput.songIds, repository);

  return repository.update(id, normalizedInput);
}

export async function deleteSetlist(
  id: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<boolean> {
  await requirePermission("setlist.manage");
  return repository.delete(id);
}

export async function getSetlistItemNotes(
  setlistId: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistItemNotes[]> {
  const actor = await requirePermission("setlist.manage");
  return repository.listItemNotes(setlistId, actor.id);
}

export async function updateSetlistItemTeamNote(
  setlistId: string,
  setlistItemId: string,
  content: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<SetlistTeamNote | null> {
  const actor = await requirePermission("setlist.manage");
  const result = await repository.updateTeamNote(
    setlistId,
    setlistItemId,
    content.trim(),
    actor.id,
    actor.displayName,
  );

  if (result === undefined) throw new SetlistItemNotFoundError();
  return result;
}

export async function updateSetlistItemPersonalNote(
  setlistId: string,
  setlistItemId: string,
  content: string,
  repository: SetlistRepository = createSetlistRepository(),
): Promise<string | null> {
  const actor = await requirePermission("setlist.manage");
  const result = await repository.updatePersonalNote(
    setlistId,
    setlistItemId,
    content.trim(),
    actor.id,
  );

  if (result === undefined) throw new SetlistItemNotFoundError();
  return result;
}
