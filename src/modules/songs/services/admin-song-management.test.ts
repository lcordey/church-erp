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

vi.mock("@/src/infrastructure/auth/require-admin", () => ({
  requireAdminAccess: () => ({ accessMode: "mvp-admin" }),
}));

import type { AdminSongRepository } from "../repositories/admin-song-repository";
import type { AdminSong, AdminSongInput } from "../types/admin-song";
import {
  attachSongMusicXml,
  attachSongPdf,
  createDraftSong,
  deleteAttachedSongMusicXml,
  deleteAttachedSongPdf,
  deleteDraftSong,
  generateAdminSongChordProFromMusicXml,
  InvalidSongMusicXmlError,
  InvalidSongPdfError,
  MissingSongMusicXmlError,
  publishSong,
  PublishedSongDeletionError,
  RestrictedSongMetadataEditError,
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
  themeIds: [],
  labelIds: [],
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
  musicXmlSource: null,
  isEditable: true,
  themes: [],
  labels: [],
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
    findMusicXmlSourceById: vi.fn(async () => null),
    attachPdf: vi.fn(async () => song),
    deletePdf: vi.fn(async () => song),
    attachMusicXml: vi.fn(async () => song),
    deleteMusicXml: vi.fn(async () => song),
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

  it("updates an official song when admin editing is requested", async () => {
    const repository = createRepository({
      ...draftSong,
      isEditable: false,
      collection: "JEM",
      collectionNumber: 42,
      sourcePageUrl: "https://jemaf.fr/chant/jem042",
    });
    const partialUpdate = {
      ...input,
      title: "Mon chant adapte",
      chordProContent: "[G]Paroles adaptees",
    };

    await expect(
      updateAdminSong(draftSong.id, partialUpdate, repository),
    ).resolves.toEqual({
      ...draftSong,
      isEditable: false,
      collection: "JEM",
      collectionNumber: 42,
      sourcePageUrl: "https://jemaf.fr/chant/jem042",
    });
    expect(repository.update).toHaveBeenCalledWith(draftSong.id, partialUpdate);
  });

  it("refuses to change locked metadata on an official song", async () => {
    const repository = createRepository({
      ...draftSong,
      isEditable: false,
      author: "Auteur officiel",
      copyright: "© JEM",
      collection: "JEM",
      collectionNumber: 42,
      sourcePageUrl: "https://jemaf.fr/chant/jem042",
    });

    await expect(
      updateAdminSong(draftSong.id, {
        ...input,
        author: "Auteur modifie",
        copyright: "© Local",
      }, repository),
    ).rejects.toBeInstanceOf(RestrictedSongMetadataEditError);
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

  it("attaches one MusicXML source to a song", async () => {
    const repository = createRepository();
    const content = `<score-partwise version="4.0"></score-partwise>`;
    const file = new File([content], "partition.musicxml", {
      type: "application/vnd.recordare.musicxml+xml",
    });

    await attachSongMusicXml(draftSong.id, file, repository);

    expect(repository.attachMusicXml).toHaveBeenCalledWith(draftSong.id, {
      content,
      fileName: "partition.musicxml",
      mimeType: "application/vnd.recordare.musicxml+xml",
      fileSizeBytes: file.size,
    });
  });

  it("rejects a non-MusicXML upload before persistence", async () => {
    const repository = createRepository();
    const file = new File(["text"], "partition.txt", {
      type: "text/plain",
    });

    await expect(
      attachSongMusicXml(draftSong.id, file, repository),
    ).rejects.toBeInstanceOf(InvalidSongMusicXmlError);
    expect(repository.attachMusicXml).not.toHaveBeenCalled();
  });

  it("deletes an attached MusicXML source", async () => {
    const repository = createRepository();

    await deleteAttachedSongMusicXml(draftSong.id, repository);

    expect(repository.deleteMusicXml).toHaveBeenCalledWith(draftSong.id);
  });

  it("generates chordpro from the active MusicXML source", async () => {
    const repository = createRepository();
    repository.findMusicXmlSourceById = vi.fn(async () => ({
      content: `<score-partwise><work><work-title>Hosanna</work-title></work><part id="P1"><measure><attributes><key><fifths>3</fifths><mode>major</mode></key></attributes><harmony><root><root-step>A</root-step></root><kind>major</kind></harmony><note><lyric><text>Hosanna</text></lyric></note></measure></part></score-partwise>`,
      fileName: "hosanna.musicxml",
      mimeType: "application/vnd.recordare.musicxml+xml",
      fileSizeBytes: 128,
      downloadUrl: `/api/songs/${draftSong.slug}/musicxml`,
    }));

    const generated = await generateAdminSongChordProFromMusicXml(
      draftSong.id,
      "default",
      repository,
    );

    expect(generated?.defaultKey).toBe("A");
    expect(generated?.chordProContent).toContain("{title: Hosanna}");
    expect(generated?.chordProContent).toContain("[A]Hosanna");
  });

  it("rejects generation when there is no MusicXML source", async () => {
    const repository = createRepository();

    await expect(
      generateAdminSongChordProFromMusicXml(draftSong.id, "default", repository),
    ).rejects.toBeInstanceOf(MissingSongMusicXmlError);
  });

  it("supports generation with the alternative ironss algorithm", async () => {
    const repository = createRepository();
    repository.findMusicXmlSourceById = vi.fn(async () => ({
      content: `<score-partwise><work><work-title>Hosanna</work-title></work><part id="P1"><measure><harmony><root><root-step>C</root-step></root><kind>major</kind></harmony><note><lyric><syllabic>begin</syllabic><text>Ho</text></lyric></note></measure><measure><harmony><root><root-step>G</root-step></root><kind>major</kind></harmony><note><lyric><syllabic>end</syllabic><text>sanna</text></lyric></note></measure></part></score-partwise>`,
      fileName: "hosanna.musicxml",
      mimeType: "application/vnd.recordare.musicxml+xml",
      fileSizeBytes: 128,
      downloadUrl: `/api/songs/${draftSong.slug}/musicxml`,
    }));

    const generated = await generateAdminSongChordProFromMusicXml(
      draftSong.id,
      "ironss",
      repository,
    );

    expect(generated?.chordProContent).toContain("[C]Ho-[G]sanna");
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
