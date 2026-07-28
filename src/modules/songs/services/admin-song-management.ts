import { requirePermission } from "@/src/infrastructure/auth/require-admin";
import {
  deleteSongPdf,
  getSongPdfStoragePath,
  uploadSongPdf,
} from "@/src/infrastructure/storage/song-pdf-storage";

import {
  createAdminSongRepository,
  type AdminSongRepository,
} from "../repositories/admin-song-repository";
import { sanitizeMusicXml } from "../music/music-xml-security";
import { hasLockedOfficialMetadata } from "../song-edit-rules";
import type {
  AdminSong,
  AdminSongInput,
  AdminSongListItem,
  GeneratedChordProResult,
  MusicXmlChordProGenerationAlgorithm,
} from "../types/admin-song";
import type { AdminSongValidationErrors } from "../validation/admin-song-input";
import {
  generateChordProFromMusicXml,
  generateChordProFromMusicXmlWithIronssAlgorithm,
} from "./musicxml-to-chordpro";

const songPdfMimeType = "application/pdf";
const maxSongPdfSizeBytes = 20 * 1024 * 1024;
const maxSongPdfFileNameLength = 180;
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
  await requirePermission("song.manage");
  return repository.listAll();
}

export async function getAdminSong(
  id: string,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requirePermission("song.manage");
  return repository.findById(id);
}

export async function createDraftSong(
  input: AdminSongInput,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong> {
  await requirePermission("song.manage");
  return repository.create(input);
}

export async function updateAdminSong(
  id: string,
  input: AdminSongInput,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requirePermission("song.manage");
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

function normalizePdfNames(content: string) {
  return content.replace(/#([0-9a-f]{2})/gi, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

async function validateSongPdf(file: File) {
  if (file.type !== songPdfMimeType) {
    throw new InvalidSongPdfError("Only PDF files are accepted.");
  }

  if (
    !/\.pdf$/i.test(file.name) ||
    file.name.length > maxSongPdfFileNameLength
  ) {
    throw new InvalidSongPdfError("The file must use a valid .pdf name.");
  }

  if (file.size <= 0) {
    throw new InvalidSongPdfError("The PDF file is empty.");
  }

  if (file.size > maxSongPdfSizeBytes) {
    throw new InvalidSongPdfError("The PDF file is too large.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  const trailer = new TextDecoder("latin1").decode(bytes.slice(-2048));

  if (!/^%PDF-\d\.\d/.test(header) || !/%%EOF[\s\0]*$/.test(trailer)) {
    throw new InvalidSongPdfError("The file does not have a valid PDF signature.");
  }

  const content = normalizePdfNames(new TextDecoder("latin1").decode(bytes));

  if (/\/(?:JavaScript|JS|Launch|RichMedia|EmbeddedFile)\b/i.test(content)) {
    throw new InvalidSongPdfError("Active PDF content is not accepted.");
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
  try {
    return sanitizeMusicXml(content);
  } catch {
    throw new InvalidSongMusicXmlError("The file does not look like MusicXML.");
  }
}

export async function attachSongPdf(
  id: string,
  file: File,
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<AdminSong | null> {
  await requirePermission("song.manage");
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  await validateSongPdf(file);

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
  await requirePermission("song.manage");
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
  await requirePermission("song.manage");
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  validateSongMusicXmlFile(file);

  const content = validateSongMusicXmlContent(await file.text());

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
  await requirePermission("song.manage");
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  return repository.deleteMusicXml(id);
}

export async function generateAdminSongChordProFromMusicXml(
  id: string,
  algorithm: MusicXmlChordProGenerationAlgorithm = "default",
  repository: AdminSongRepository = createAdminSongRepository(),
): Promise<GeneratedChordProResult | null> {
  await requirePermission("song.manage");
  const song = await repository.findById(id);

  if (!song) {
    return null;
  }

  const musicXmlSource = await repository.findMusicXmlSourceById(id);

  if (!musicXmlSource) {
    throw new MissingSongMusicXmlError();
  }

  try {
    const generator = algorithm === "ironss"
      ? generateChordProFromMusicXmlWithIronssAlgorithm
      : generateChordProFromMusicXml;

    return generator(musicXmlSource.content, {
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
  await requirePermission("song.manage");
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
  await requirePermission("song.manage");
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
  await requirePermission("song.manage");
  return repository.updateStatus(id, "draft");
}
