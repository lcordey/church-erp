import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  songs,
  songSources,
} from "@/src/infrastructure/database/schema";

import type {
  AdminSong,
  AdminSongInput,
  AdminSongListItem,
} from "../types/admin-song";

export class SongSlugConflictError extends Error {
  constructor() {
    super("A song with this slug already exists.");
  }
}

const defaultLocalCollection = "LeMont";

export interface AdminSongRepository {
  listAll(): Promise<AdminSongListItem[]>;
  findById(id: string): Promise<AdminSong | null>;
  create(input: AdminSongInput): Promise<AdminSong>;
  update(id: string, input: AdminSongInput): Promise<AdminSong | null>;
  delete(id: string): Promise<boolean>;
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

function toAdminSong(
  row: Omit<AdminSong, "chordProContent"> & {
    chordProContent: string | null;
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
    isEditable: song.isEditable,
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

  async function findById(id: string): Promise<AdminSong | null> {
    const rows = await database
      .select(adminSongSelection)
      .from(songs)
      .innerJoin(songSources, eq(songSources.songId, songs.id))
      .where(and(eq(songs.id, id), activeChordPro))
      .limit(1);

    return rows[0] ? toAdminSong(rows[0]) : null;
  }

  return {
    async listAll() {
      const rows = await database
        .select(adminSongSelection)
        .from(songs)
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(activeChordPro)
        .orderBy(asc(songs.title));

      return rows.map(toAdminSong).map(toAdminSongListItem);
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
