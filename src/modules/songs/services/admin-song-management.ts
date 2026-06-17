import { requireAdminAccess } from "@/src/infrastructure/auth/require-admin";

import {
  createAdminSongRepository,
  type AdminSongRepository,
} from "../repositories/admin-song-repository";
import type {
  AdminSong,
  AdminSongInput,
  AdminSongListItem,
} from "../types/admin-song";

export async function listAdminSongs(
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSongListItem[]> {
  requireAdminAccess();
  return repository.listAll();
}

export async function getAdminSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  requireAdminAccess();
  return repository.findById(id);
}

export async function createDraftSong(
  input: AdminSongInput,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong> {
  requireAdminAccess();
  return repository.create(input);
}

export async function updateAdminSong(
  id: string,
  input: AdminSongInput,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  if (!song.isEditable) {
    throw new ReadOnlySongError();
  }

  return repository.update(id, input);
}

export class ReadOnlySongError extends Error {
  constructor() {
    super("Official songs cannot be edited directly.");
  }
}

export class PublishedSongDeletionError extends Error {
  constructor() {
    super("Published songs must be unpublished before deletion.");
  }
}

export async function deleteDraftSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<boolean> {
  requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return false;
  }

  if (song.status === "published") {
    throw new PublishedSongDeletionError();
  }

  if (!song.isEditable) {
    throw new ReadOnlySongError();
  }

  return repository.delete(id);
}

export async function publishSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  if (!song.title || !song.slug || !song.chordProContent) {
    throw new Error("Song is incomplete and cannot be published.");
  }

  return repository.updateStatus(id, "published");
}

export async function unpublishSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  requireAdminAccess();
  return repository.updateStatus(id, "draft");
}
