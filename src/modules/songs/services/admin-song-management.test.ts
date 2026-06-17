import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteSongPdf, uploadSongPdf } = vi.hoisted(() => ({
  deleteSongPdf: vi.fn(),
  uploadSongPdf: vi.fn(),
}));

vi.mock("@/src/infrastructure/storage/song-pdf-storage", () => ({
  deleteSongPdf,
  getSongPdfStoragePath: (songId: string) => `songs/${songId}/score.pdf`,
  uploadSongPdf,
}));

import type { AdminSongRepository } from "../repositories/admin-song-repository";
import type { AdminSong, AdminSongInput } from "../types/admin-song";
import {
  attachSongPdf,
  createDraftSong,
  deleteAttachedSongPdf,
  deleteDraftSong,
  InvalidSongPdfError,
  publishSong,
  PublishedSongDeletionError,
  ReadOnlySongError,
  unpublishSong,
  updateAdminSong,
} from "./admin-song-management";

const input: AdminSongInput = {
  title: "Mon chant",
  slug: "mon-chant",
  author: null,
  copyright: null,
  defaultKey: "C",
  chordProContent: "[C]Paroles",
};

const draftSong: AdminSong = {
  id: "11111111-1111-4111-8111-111111111111",
  ...input,
  status: "draft",
  collection: null,
  collectionNumber: null,
  sourcePageUrl: null,
  sourceChordProUrl: null,
  pdfSource: null,
  isEditable: true,
  createdAt: new Date("2026-06-15T18:00:00Z"),
  updatedAt: new Date("2026-06-15T18:00:00Z"),
};

function createRepository(song: AdminSong | null = draftSong) {
  const repository: AdminSongRepository = {
    listAll: vi.fn(async () => []),
    findById: vi.fn(async () => song),
    create: vi.fn(async () => draftSong),
    update: vi.fn(async () => song),
    delete: vi.fn(async () => true),
    findPdfSourceById: vi.fn(async () => null),
    attachPdf: vi.fn(async () => song),
    deletePdf: vi.fn(async () => song),
    updateStatus: vi.fn(async (_id, status) =>
      song ? { ...song, status } : null,
    ),
  };

  return repository;
}

describe("admin song management", () => {
  beforeEach(() => {
    deleteSongPdf.mockReset();
    uploadSongPdf.mockReset();
  });

  it("creates a song through the draft workflow", async () => {
    const repository = createRepository();

    const song = await createDraftSong(input, repository);

    expect(song.status).toBe("draft");
    expect(repository.create).toHaveBeenCalledWith(input);
  });

  it("publishes a complete song", async () => {
    const repository = createRepository();

    const song = await publishSong(draftSong.id, repository);

    expect(song?.status).toBe("published");
    expect(repository.updateStatus).toHaveBeenCalledWith(
      draftSong.id,
      "published",
    );
  });

  it("refuses to publish an incomplete song", async () => {
    const repository = createRepository({
      ...draftSong,
      chordProContent: "",
    });

    await expect(publishSong(draftSong.id, repository)).rejects.toThrow(
      "incomplete",
    );
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("returns a published song to draft status", async () => {
    const repository = createRepository({
      ...draftSong,
      status: "published",
    });

    const song = await unpublishSong(draftSong.id, repository);

    expect(song?.status).toBe("draft");
  });

  it("refuses to update a read-only official song", async () => {
    const repository = createRepository({
      ...draftSong,
      isEditable: false,
    });

    await expect(
      updateAdminSong(draftSong.id, input, repository),
    ).rejects.toBeInstanceOf(ReadOnlySongError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("attaches one PDF source to a song", async () => {
    const repository = createRepository();
    const file = new File(["pdf"], "partition.pdf", {
      type: "application/pdf",
    });

    await attachSongPdf(draftSong.id, file, repository);

    expect(uploadSongPdf).toHaveBeenCalledWith(
      `songs/${draftSong.id}/score.pdf`,
      file,
    );
    expect(repository.attachPdf).toHaveBeenCalledWith(draftSong.id, {
      storagePath: `songs/${draftSong.id}/score.pdf`,
      fileName: "partition.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: file.size,
    });
  });

  it("rejects a non-PDF upload before storage", async () => {
    const repository = createRepository();
    const file = new File(["text"], "partition.txt", {
      type: "text/plain",
    });

    await expect(
      attachSongPdf(draftSong.id, file, repository),
    ).rejects.toBeInstanceOf(InvalidSongPdfError);
    expect(uploadSongPdf).not.toHaveBeenCalled();
    expect(repository.attachPdf).not.toHaveBeenCalled();
  });

  it("deletes an attached PDF source and object", async () => {
    const repository = createRepository();
    repository.findPdfSourceById = vi.fn(async () => ({
      storagePath: `songs/${draftSong.id}/score.pdf`,
      fileName: "partition.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 10,
      downloadUrl: `/api/songs/${draftSong.slug}/pdf`,
    }));

    await deleteAttachedSongPdf(draftSong.id, repository);

    expect(deleteSongPdf).toHaveBeenCalledWith(
      `songs/${draftSong.id}/score.pdf`,
    );
    expect(repository.deletePdf).toHaveBeenCalledWith(draftSong.id);
  });

  it("deletes a draft", async () => {
    const repository = createRepository();

    await expect(deleteDraftSong(draftSong.id, repository)).resolves.toBe(true);
    expect(repository.delete).toHaveBeenCalledWith(draftSong.id);
  });

  it("refuses to delete a published song", async () => {
    const repository = createRepository({
      ...draftSong,
      status: "published",
    });

    await expect(deleteDraftSong(draftSong.id, repository)).rejects.toBeInstanceOf(
      PublishedSongDeletionError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
