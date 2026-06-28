import { requireAdminAccess } from "@/src/infrastructure/auth/require-admin";
import {
  deleteSongPdf,
  getSongPdfStoragePath,
  uploadSongPdf,
} from "@/src/infrastructure/storage/song-pdf-storage";

import {
  createAdminSongRepository,
  type AdminSongRepository,
} from "../repositories/admin-song-repository";
import { hasLockedOfficialMetadata } from "../song-edit-rules";
import type {
  AdminSong,
  AdminSongInput,
  AdminSongListItem,
  GeneratedChordProResult,
} from "../types/admin-song";
import type { AdminSongValidationErrors } from "../validation/admin-song-input";
import { generateChordProFromMusicXml } from "./musicxml-to-chordpro";

const songPdfMimeType = "application/pdf";
const maxSongPdfSizeBytes = 20 * 1024 * 1024;
const acceptedSongMusicXmlMimeTypes = new Set([
  "application/vnd.recordare.musicxml+xml",
  "application/octet-stream",
  "application/xml",
  "text/xml",
  "text/plain",
  "",
]);
const maxSongMusicXmlSizeBytes = 5 * 1024 * 1024;

export async function listAdminSongs(
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSongListItem[]> {
  await requireAdminAccess();
  return repository.listAll();
}

export async function getAdminSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
  return repository.findById(id);
}

export async function createDraftSong(
  input: AdminSongInput,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong> {
  await requireAdminAccess();
  return repository.create(input);
}

export async function updateAdminSong(
  id: string,
  input: AdminSongInput,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  if (hasLockedOfficialMetadata(song)) {
    const fields: AdminSongValidationErrors = {};

    if (input.author !== song.author) {
      fields.author =
        "L’auteur d’un chant provenant d’une source officielle ne peut pas être modifié.";
    }

    if (input.copyright !== song.copyright) {
      fields.copyright =
        "Le copyright d’un chant provenant d’une source officielle ne peut pas être modifié.";
    }

    if (Object.keys(fields).length > 0) {
      throw new RestrictedSongMetadataEditError(fields);
    }
  }

  return repository.update(id, input);
}

export class PublishedSongDeletionError extends Error {
  constructor() {
    super("Published songs must be unpublished before deletion.");
  }
}

export class InvalidSongPdfError extends Error {
  constructor(message = "The uploaded song PDF is invalid.") {
    super(message);
  }
}

export class InvalidSongMusicXmlError extends Error {
  constructor(message = "The uploaded song MusicXML is invalid.") {
    super(message);
  }
}

export class MissingSongMusicXmlError extends Error {
  constructor() {
    super("The song has no active MusicXML source.");
  }
}

export class RestrictedSongMetadataEditError extends Error {
  constructor(readonly fields: AdminSongValidationErrors) {
    super("Official song provenance fields cannot be edited.");
  }
}

function validateSongPdf(file: File) {
  if (file.type !== songPdfMimeType) {
    throw new InvalidSongPdfError("Only PDF files are accepted.");
  }

  if (file.size <= 0) {
    throw new InvalidSongPdfError("The PDF file is empty.");
  }

  if (file.size > maxSongPdfSizeBytes) {
    throw new InvalidSongPdfError("The PDF file is too large.");
  }
}

function hasMusicXmlFileName(fileName: string) {
  return /\.musicxml$/i.test(fileName) || /\.xml$/i.test(fileName);
}

function validateSongMusicXmlFile(file: File) {
  if (!acceptedSongMusicXmlMimeTypes.has(file.type)) {
    throw new InvalidSongMusicXmlError("Only MusicXML files are accepted.");
  }

  if (!hasMusicXmlFileName(file.name)) {
    throw new InvalidSongMusicXmlError("The file must use a .musicxml or .xml extension.");
  }

  if (file.size <= 0) {
    throw new InvalidSongMusicXmlError("The MusicXML file is empty.");
  }

  if (file.size > maxSongMusicXmlSizeBytes) {
    throw new InvalidSongMusicXmlError("The MusicXML file is too large.");
  }
}

function validateSongMusicXmlContent(content: string) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new InvalidSongMusicXmlError("The MusicXML file is empty.");
  }

  if (
    !normalizedContent.includes("<score-partwise") &&
    !normalizedContent.includes("<score-timewise")
  ) {
    throw new InvalidSongMusicXmlError("The file does not look like MusicXML.");
  }
}

export async function attachSongPdf(
  id: string,
  file: File,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  validateSongPdf(file);

  const storagePath = getSongPdfStoragePath(id);

  await uploadSongPdf(storagePath, file);

  return repository.attachPdf(id, {
    storagePath,
    fileName: file.name || "partition.pdf",
    mimeType: songPdfMimeType,
    fileSizeBytes: file.size,
  });
}

export async function deleteAttachedSongPdf(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  const pdfSource = await repository.findPdfSourceById(id);

  if (pdfSource) {
    await deleteSongPdf(pdfSource.storagePath);
  }

  return repository.deletePdf(id);
}

export async function attachSongMusicXml(
  id: string,
  file: File,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  validateSongMusicXmlFile(file);

  const content = await file.text();

  validateSongMusicXmlContent(content);

  return repository.attachMusicXml(id, {
    content,
    fileName: file.name || "partition.musicxml",
    mimeType: file.type || "application/vnd.recordare.musicxml+xml",
    fileSizeBytes: file.size,
  });
}

export async function deleteAttachedSongMusicXml(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  return repository.deleteMusicXml(id);
}

export async function generateAdminSongChordProFromMusicXml(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<GeneratedChordProResult | null> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  const musicXmlSource = await repository.findMusicXmlSourceById(id);

  if (!musicXmlSource) {
    throw new MissingSongMusicXmlError();
  }

  try {
    return generateChordProFromMusicXml(musicXmlSource.content, {
      title: song.title,
      author: song.author,
      defaultKey: song.defaultKey,
    });
  } catch {
    throw new InvalidSongMusicXmlError(
      "The active MusicXML source cannot be converted into ChordPro.",
    );
  }
}

export async function deleteDraftSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<boolean> {
  await requireAdminAccess();
  const song = await repository.findById(id);

  if (!song) {
    return false;
  }

  if (song.status === "published") {
    throw new PublishedSongDeletionError();
  }

  return repository.delete(id);
}

export async function publishSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requireAdminAccess();
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
  await requireAdminAccess();
  return repository.updateStatus(id, "draft");
}
