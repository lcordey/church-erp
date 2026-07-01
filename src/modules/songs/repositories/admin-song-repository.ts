import { and, asc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  songLabelAssignments,
  songLabels,
  songs,
  songSources,
  songThemeAssignments,
  songThemes,
} from "@/src/infrastructure/database/schema";

import type {
  AdminSong,
  AdminSongInput,
  AdminSongListItem,
  AdminSongMusicXmlInput,
  AdminSongPdfInput,
} from "../types/admin-song";
import type {
  SongMusicXmlFileSource,
  SongMusicXmlSource,
  SongPdfFileSource,
  SongPdfSource,
} from "../types/public-song";

export class SongSlugConflictError extends Error {
  constructor() {
    super("A song with this slug already exists.");
  }
}

export class InvalidSongTaxonomySelectionError extends Error {
  constructor() {
    super("One or more selected themes or labels do not exist.");
  }
}

const defaultLocalCollection = "LeMont";

export interface AdminSongRepository {
  listAll(): Promise<AdminSongListItem[]>;
  findById(id: string): Promise<AdminSong | null>;
  create(input: AdminSongInput): Promise<AdminSong>;
  update(id: string, input: AdminSongInput): Promise<AdminSong | null>;
  delete(id: string): Promise<boolean>;
  findPdfSourceById(id: string): Promise<SongPdfFileSource | null>;
  findMusicXmlSourceById(id: string): Promise<SongMusicXmlFileSource | null>;
  attachPdf(id: string, input: AdminSongPdfInput): Promise<AdminSong | null>;
  deletePdf(id: string): Promise<AdminSong | null>;
  attachMusicXml(
    id: string,
    input: AdminSongMusicXmlInput,
  ): Promise<AdminSong | null>;
  deleteMusicXml(id: string): Promise<AdminSong | null>;
  updateStatus(
    id: string,
    status: "draft" | "published",
  ): Promise<AdminSong | null>;
}

const adminSongSelection = {
  id: songs.id,
  title: songs.title,
  slug: songs.slug,
  status: songs.status,
  author: songs.author,
  copyright: songs.copyright,
  defaultKey: songs.defaultKey,
  collection: songs.collection,
  collectionNumber: songs.collectionNumber,
  sourcePageUrl: songs.sourcePageUrl,
  sourceChordProUrl: songSources.externalUrl,
  isEditable: songs.isEditable,
  chordProContent: songSources.textContent,
  createdAt: songs.createdAt,
  updatedAt: songs.updatedAt,
};

const pdfSelection = {
  songId: songSources.songId,
  slug: songs.slug,
  storagePath: songSources.storagePath,
  fileName: songSources.fileName,
  mimeType: songSources.mimeType,
  fileSizeBytes: songSources.fileSizeBytes,
};

const musicXmlSelection = {
  songId: songSources.songId,
  slug: songs.slug,
  fileName: songSources.fileName,
  mimeType: songSources.mimeType,
  fileSizeBytes: songSources.fileSizeBytes,
};

const musicXmlFileSelection = {
  ...musicXmlSelection,
  content: songSources.textContent,
};

type PdfSelectionRow = {
  songId: string;
  slug: string;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

type MusicXmlSelectionRow = {
  songId: string;
  slug: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

type MusicXmlFileSelectionRow = MusicXmlSelectionRow & {
  content: string | null;
};

function toPdfSource(row: PdfSelectionRow): SongPdfFileSource | null {
  if (!row.storagePath) {
    return null;
  }

  return {
    storagePath: row.storagePath,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadUrl: `/api/songs/${row.slug}/pdf`,
  };
}

function toAdminPdfSource(source: SongPdfFileSource | null): SongPdfSource | null {
  if (!source) {
    return null;
  }

  return {
    fileName: source.fileName,
    mimeType: source.mimeType,
    fileSizeBytes: source.fileSizeBytes,
    downloadUrl: source.downloadUrl,
  };
}

function toMusicXmlSource(row: MusicXmlSelectionRow): SongMusicXmlSource {
  return {
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadUrl: `/api/songs/${row.slug}/musicxml`,
  };
}

function toMusicXmlFileSource(
  row: MusicXmlFileSelectionRow,
): SongMusicXmlFileSource | null {
  if (!row.content) {
    return null;
  }

  return {
    content: row.content,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadUrl: `/api/songs/${row.slug}/musicxml`,
  };
}

function toAdminSong(
  row: Omit<AdminSong, "chordProContent"> & {
    chordProContent: string | null;
    pdfSource?: SongPdfSource | null;
    musicXmlSource?: SongMusicXmlSource | null;
  },
): AdminSong {
  if (!row.chordProContent) {
    throw new Error(`Song "${row.id}" has no active ChordPro source.`);
  }

  return { ...row, chordProContent: row.chordProContent };
}

function toAdminSongListItem(song: AdminSong): AdminSongListItem {
  return {
    id: song.id,
    title: song.title,
    slug: song.slug,
    status: song.status,
    author: song.author,
    copyright: song.copyright,
    defaultKey: song.defaultKey,
    collection: song.collection,
    collectionNumber: song.collectionNumber,
    sourcePageUrl: song.sourcePageUrl,
    sourceChordProUrl: song.sourceChordProUrl,
    pdfSource: song.pdfSource,
    musicXmlSource: song.musicXmlSource,
    isEditable: song.isEditable,
    themes: song.themes,
    labels: song.labels,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function createAdminSongRepository(): AdminSongRepository {
  const database = getDatabase();
  const activeChordPro = and(
    eq(songSources.sourceType, "chordpro"),
    eq(songSources.status, "active"),
  );
  const activePdf = and(
    eq(songSources.sourceType, "pdf"),
    eq(songSources.status, "active"),
  );
  const activeMusicXml = and(
    eq(songSources.sourceType, "musicxml"),
    eq(songSources.status, "active"),
  );

  async function findActivePdfSources(songIds: string[]) {
    if (songIds.length === 0) {
      return new Map<string, SongPdfSource>();
    }

    const rows = await database
      .select(pdfSelection)
      .from(songSources)
      .innerJoin(songs, eq(songSources.songId, songs.id))
      .where(and(activePdf, inArray(songSources.songId, songIds)));

    return new Map(
      rows.flatMap((row) => {
        const source = toAdminPdfSource(toPdfSource(row));
        return source ? [[row.songId, source]] : [];
      }),
    );
  }

  async function findActiveMusicXmlSources(songIds: string[]) {
    if (songIds.length === 0) {
      return new Map<string, SongMusicXmlSource>();
    }

    const rows = await database
      .select(musicXmlSelection)
      .from(songSources)
      .innerJoin(songs, eq(songSources.songId, songs.id))
      .where(and(activeMusicXml, inArray(songSources.songId, songIds)));

    return new Map(
      rows.map((row) => [row.songId, toMusicXmlSource(row)]),
    );
  }

  async function findSongTaxonomies(songIds: string[]) {
    const themesBySongId = new Map<string, { id: string; name: string }[]>();
    const labelsBySongId = new Map<string, { id: string; name: string }[]>();

    if (songIds.length === 0) {
      return { themesBySongId, labelsBySongId };
    }

    const [themeRows, labelRows] = await Promise.all([
      database
        .select({
          songId: songThemeAssignments.songId,
          id: songThemes.id,
          name: songThemes.name,
        })
        .from(songThemeAssignments)
        .innerJoin(songThemes, eq(songThemeAssignments.themeId, songThemes.id))
        .where(inArray(songThemeAssignments.songId, songIds))
        .orderBy(asc(songThemes.name)),
      database
        .select({
          songId: songLabelAssignments.songId,
          id: songLabels.id,
          name: songLabels.name,
        })
        .from(songLabelAssignments)
        .innerJoin(songLabels, eq(songLabelAssignments.labelId, songLabels.id))
        .where(inArray(songLabelAssignments.songId, songIds))
        .orderBy(asc(songLabels.name)),
    ]);

    for (const row of themeRows) {
      themesBySongId.set(row.songId, [
        ...(themesBySongId.get(row.songId) ?? []),
        { id: row.id, name: row.name },
      ]);
    }

    for (const row of labelRows) {
      labelsBySongId.set(row.songId, [
        ...(labelsBySongId.get(row.songId) ?? []),
        { id: row.id, name: row.name },
      ]);
    }

    return { themesBySongId, labelsBySongId };
  }

  async function assertTaxonomySelectionsExist(
    transaction: Parameters<Parameters<typeof database.transaction>[0]>[0],
    input: AdminSongInput,
  ) {
    const [selectedThemes, selectedLabels] = await Promise.all([
      input.themeIds.length > 0
        ? transaction
            .select({ id: songThemes.id })
            .from(songThemes)
            .where(inArray(songThemes.id, input.themeIds))
        : [],
      input.labelIds.length > 0
        ? transaction
            .select({ id: songLabels.id })
            .from(songLabels)
            .where(inArray(songLabels.id, input.labelIds))
        : [],
    ]);

    if (
      selectedThemes.length !== input.themeIds.length ||
      selectedLabels.length !== input.labelIds.length
    ) {
      throw new InvalidSongTaxonomySelectionError();
    }
  }

  async function replaceTaxonomyAssignments(
    transaction: Parameters<Parameters<typeof database.transaction>[0]>[0],
    songId: string,
    input: AdminSongInput,
  ) {
    await assertTaxonomySelectionsExist(transaction, input);
    await Promise.all([
      transaction
        .delete(songThemeAssignments)
        .where(eq(songThemeAssignments.songId, songId)),
      transaction
        .delete(songLabelAssignments)
        .where(eq(songLabelAssignments.songId, songId)),
    ]);

    if (input.themeIds.length > 0) {
      await transaction.insert(songThemeAssignments).values(
        input.themeIds.map((themeId) => ({ songId, themeId })),
      );
    }

    if (input.labelIds.length > 0) {
      await transaction.insert(songLabelAssignments).values(
        input.labelIds.map((labelId) => ({ songId, labelId })),
      );
    }
  }

  async function findById(id: string): Promise<AdminSong | null> {
    const rows = await database
      .select(adminSongSelection)
      .from(songs)
      .innerJoin(songSources, eq(songSources.songId, songs.id))
      .where(and(eq(songs.id, id), activeChordPro))
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    const pdfSources = await findActivePdfSources([rows[0].id]);
    const musicXmlSources = await findActiveMusicXmlSources([rows[0].id]);
    const { themesBySongId, labelsBySongId } = await findSongTaxonomies([
      rows[0].id,
    ]);

    return toAdminSong({
      ...rows[0],
      pdfSource: pdfSources.get(rows[0].id) ?? null,
      musicXmlSource: musicXmlSources.get(rows[0].id) ?? null,
      themes: themesBySongId.get(rows[0].id) ?? [],
      labels: labelsBySongId.get(rows[0].id) ?? [],
    });
  }

  return {
    async listAll() {
      const rows = await database
        .select(adminSongSelection)
        .from(songs)
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(activeChordPro)
        .orderBy(asc(songs.title));

      const pdfSources = await findActivePdfSources(
        rows.map((row) => row.id),
      );
      const musicXmlSources = await findActiveMusicXmlSources(
        rows.map((row) => row.id),
      );
      const { themesBySongId, labelsBySongId } = await findSongTaxonomies(
        rows.map((row) => row.id),
      );

      return rows
        .map((row) =>
          toAdminSong({
            ...row,
            pdfSource: pdfSources.get(row.id) ?? null,
            musicXmlSource: musicXmlSources.get(row.id) ?? null,
            themes: themesBySongId.get(row.id) ?? [],
            labels: labelsBySongId.get(row.id) ?? [],
          }),
        )
        .map(toAdminSongListItem);
    },

    findById,

    async create(input) {
      try {
        const songId = await database.transaction(async (transaction) => {
          const [createdSong] = await transaction
            .insert(songs)
            .values({
              title: input.title,
              slug: input.slug,
              author: input.author,
              copyright: input.copyright,
              defaultKey: input.defaultKey,
              collection: defaultLocalCollection,
            })
            .returning({ id: songs.id });

          await transaction.insert(songSources).values({
            songId: createdSong.id,
            sourceType: "chordpro",
            status: "active",
            textContent: input.chordProContent,
          });
          await replaceTaxonomyAssignments(
            transaction,
            createdSong.id,
            input,
          );

          return createdSong.id;
        });

        const created = await findById(songId);

        if (!created) {
          throw new Error("Created song could not be reloaded.");
        }

        return created;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new SongSlugConflictError();
        }

        throw error;
      }
    },

    async update(id, input) {
      try {
        const updated = await database.transaction(async (transaction) => {
          const [updatedSong] = await transaction
            .update(songs)
            .set({
              title: input.title,
              slug: input.slug,
              author: input.author,
              copyright: input.copyright,
              defaultKey: input.defaultKey,
              updatedAt: new Date(),
            })
            .where(eq(songs.id, id))
            .returning({ id: songs.id });

          if (!updatedSong) {
            return false;
          }

          await transaction
            .update(songSources)
            .set({
              textContent: input.chordProContent,
              updatedAt: new Date(),
            })
            .where(and(eq(songSources.songId, id), activeChordPro));
          await replaceTaxonomyAssignments(transaction, id, input);

          return true;
        });

        return updated ? findById(id) : null;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new SongSlugConflictError();
        }

        throw error;
      }
    },

    async delete(id) {
      const deletedSongs = await database
        .delete(songs)
        .where(eq(songs.id, id))
        .returning({ id: songs.id });

      return deletedSongs.length > 0;
    },

    async findPdfSourceById(id) {
      const rows = await database
        .select(pdfSelection)
        .from(songSources)
        .innerJoin(songs, eq(songSources.songId, songs.id))
        .where(and(eq(songs.id, id), activePdf))
        .limit(1);

      return rows[0] ? toPdfSource(rows[0]) : null;
    },

    async findMusicXmlSourceById(id) {
      const rows = await database
        .select(musicXmlFileSelection)
        .from(songSources)
        .innerJoin(songs, eq(songSources.songId, songs.id))
        .where(and(eq(songs.id, id), activeMusicXml))
        .limit(1);

      return rows[0] ? toMusicXmlFileSource(rows[0]) : null;
    },

    async attachPdf(id, input) {
      await database.transaction(async (transaction) => {
        await transaction
          .update(songSources)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(and(eq(songSources.songId, id), activePdf));

        await transaction.insert(songSources).values({
          songId: id,
          sourceType: "pdf",
          status: "active",
          storagePath: input.storagePath,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSizeBytes: input.fileSizeBytes,
        });
      });

      return findById(id);
    },

    async deletePdf(id) {
      await database
        .update(songSources)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(and(eq(songSources.songId, id), activePdf));

      return findById(id);
    },

    async attachMusicXml(id, input) {
      await database.transaction(async (transaction) => {
        await transaction
          .update(songSources)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(and(eq(songSources.songId, id), activeMusicXml));

        await transaction.insert(songSources).values({
          songId: id,
          sourceType: "musicxml",
          status: "active",
          textContent: input.content,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSizeBytes: input.fileSizeBytes,
        });
      });

      return findById(id);
    },

    async deleteMusicXml(id) {
      await database
        .update(songSources)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(and(eq(songSources.songId, id), activeMusicXml));

      return findById(id);
    },

    async updateStatus(id, status) {
      const [updatedSong] = await database
        .update(songs)
        .set({ status, updatedAt: new Date() })
        .where(eq(songs.id, id))
        .returning({ id: songs.id });

      return updatedSong ? findById(id) : null;
    },
  };
}
