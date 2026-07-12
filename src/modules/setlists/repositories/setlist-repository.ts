import { and, asc, count, eq, exists, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  setlistItems,
  setlistItemPersonalNotes,
  setlistItemTeamNotes,
  setlists,
  songs,
  songSources,
  users,
} from "@/src/infrastructure/database/schema";
import type { PublicSongDetail, SongMusicXmlSource, SongPdfSource } from "@/src/modules/songs/types/public-song";

import type {
  SetlistDetail,
  SetlistInput,
  SetlistItemNotes,
  SetlistSummary,
  SetlistTeamNote,
} from "../types/setlist";

export interface SetlistRepository {
  listAll(): Promise<SetlistSummary[]>;
  findById(id: string): Promise<SetlistDetail | null>;
  create(input: SetlistInput): Promise<SetlistDetail>;
  update(id: string, input: SetlistInput): Promise<SetlistDetail | null>;
  delete(id: string): Promise<boolean>;
  listPublishedSongIds(songIds: string[]): Promise<Set<string>>;
  listItemNotes(setlistId: string, userId: string): Promise<SetlistItemNotes[]>;
  updateTeamNote(
    setlistId: string,
    setlistItemId: string,
    content: string,
    userId: string,
    userDisplayName: string,
  ): Promise<SetlistTeamNote | null | undefined>;
  updatePersonalNote(
    setlistId: string,
    setlistItemId: string,
    content: string,
    userId: string,
  ): Promise<string | null | undefined>;
}

const publishedSongCondition = eq(songs.status, "published");

const songDetailSelection = {
  id: songs.id,
  title: songs.title,
  slug: songs.slug,
  author: songs.author,
  copyright: songs.copyright,
  defaultKey: songs.defaultKey,
  collection: songs.collection,
  collectionNumber: songs.collectionNumber,
  sourcePageUrl: songs.sourcePageUrl,
};

const setlistItemSelection = {
  itemId: setlistItems.id,
  setlistId: setlistItems.setlistId,
  position: setlistItems.position,
  ...songDetailSelection,
};

type SetlistRow = typeof setlists.$inferSelect;

type SetlistItemRow = {
  itemId: string;
  setlistId: string;
  position: number;
  id: string;
  title: string;
  slug: string;
  author: string | null;
  copyright: string | null;
  defaultKey: string | null;
  collection: string | null;
  collectionNumber: number | null;
  sourcePageUrl: string | null;
  chordProContent: string | null;
  pdfFileName: string | null;
  pdfMimeType: string | null;
  pdfFileSizeBytes: number | null;
  pdfStoragePath: string | null;
  musicXmlFileName: string | null;
  musicXmlMimeType: string | null;
  musicXmlFileSizeBytes: number | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
};

type PdfRow = {
  songId: string;
  slug: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  storagePath: string | null;
};

type MusicXmlRow = {
  songId: string;
  slug: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

function toSummary(row: SetlistRow, songCount: number): SetlistSummary {
  return {
    id: row.id,
    title: row.title,
    songCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPdfSource(row: PdfRow): SongPdfSource | null {
  if (!row.storagePath) {
    return null;
  }

  return {
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadUrl: `/api/songs/${row.slug}/pdf`,
  };
}

function toMusicXmlSource(row: MusicXmlRow): SongMusicXmlSource {
  return {
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadUrl: `/api/songs/${row.slug}/musicxml`,
  };
}

function toSongDetail(
  row: SetlistItemRow,
  pdfSource: SongPdfSource | null,
  musicXmlSource: SongMusicXmlSource | null,
): PublicSongDetail {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    author: row.author,
    copyright: row.copyright,
    defaultKey: row.defaultKey,
    collection: row.collection,
    collectionNumber: row.collectionNumber,
    sourcePageUrl: row.sourcePageUrl,
    spotifyUrl: row.spotifyUrl,
    youtubeUrl: row.youtubeUrl,
    pdfSource,
    musicXmlSource,
    chordProContent: row.chordProContent,
  };
}

export function createSetlistRepository(): SetlistRepository {
  const database = getDatabase();
  const chordProSources = alias(songSources, "setlist_song_chordpro_sources");
  const pdfSources = alias(songSources, "setlist_song_pdf_sources");
  const musicXmlSources = alias(songSources, "setlist_song_musicxml_sources");
  const spotifySources = alias(songSources, "setlist_song_spotify_sources");
  const youtubeSources = alias(songSources, "setlist_song_youtube_sources");
  const publishedSongHasActiveSourceCondition = and(
    publishedSongCondition,
    exists(
      database
        .select({ value: sql`1` })
        .from(songSources)
        .where(and(eq(songSources.songId, songs.id), eq(songSources.status, "active"))),
    ),
  );

  async function loadDetail(row: SetlistRow): Promise<SetlistDetail> {
    const itemRows = await database
      .select({
        ...setlistItemSelection,
        chordProContent: chordProSources.textContent,
        pdfFileName: pdfSources.fileName,
        pdfMimeType: pdfSources.mimeType,
        pdfFileSizeBytes: pdfSources.fileSizeBytes,
        pdfStoragePath: pdfSources.storagePath,
        musicXmlFileName: musicXmlSources.fileName,
        musicXmlMimeType: musicXmlSources.mimeType,
        musicXmlFileSizeBytes: musicXmlSources.fileSizeBytes,
        spotifyUrl: spotifySources.externalUrl,
        youtubeUrl: youtubeSources.externalUrl,
      })
      .from(setlistItems)
      .innerJoin(songs, eq(setlistItems.songId, songs.id))
      .leftJoin(
        chordProSources,
        and(eq(chordProSources.songId, songs.id), eq(chordProSources.sourceType, "chordpro"), eq(chordProSources.status, "active")),
      )
      .leftJoin(
        pdfSources,
        and(eq(pdfSources.songId, songs.id), eq(pdfSources.sourceType, "pdf"), eq(pdfSources.status, "active")),
      )
      .leftJoin(
        musicXmlSources,
        and(
          eq(musicXmlSources.songId, songs.id),
          eq(musicXmlSources.sourceType, "musicxml"),
          eq(musicXmlSources.status, "active"),
        ),
      )
      .leftJoin(
        spotifySources,
        and(
          eq(spotifySources.songId, songs.id),
          eq(spotifySources.sourceType, "spotify"),
          eq(spotifySources.status, "active"),
        ),
      )
      .leftJoin(
        youtubeSources,
        and(
          eq(youtubeSources.songId, songs.id),
          eq(youtubeSources.sourceType, "youtube"),
          eq(youtubeSources.status, "active"),
        ),
      )
      .where(
        and(
          eq(setlistItems.setlistId, row.id),
          publishedSongHasActiveSourceCondition,
        ),
      )
      .orderBy(asc(setlistItems.position));

    return {
      ...toSummary(row, itemRows.length),
      items: itemRows.map((item) => ({
        id: item.itemId,
        position: item.position,
        song: toSongDetail(
          item,
          toPdfSource({
            songId: item.id,
            slug: item.slug,
            fileName: item.pdfFileName,
            mimeType: item.pdfMimeType,
            fileSizeBytes: item.pdfFileSizeBytes,
            storagePath: item.pdfStoragePath,
          }),
          item.musicXmlFileName || item.musicXmlMimeType || item.musicXmlFileSizeBytes
            ? toMusicXmlSource({
                songId: item.id,
                slug: item.slug,
                fileName: item.musicXmlFileName,
                mimeType: item.musicXmlMimeType,
                fileSizeBytes: item.musicXmlFileSizeBytes,
              })
            : null,
        ),
      })),
    };
  }

  async function findById(id: string): Promise<SetlistDetail | null> {
    const rows = await database
      .select()
      .from(setlists)
      .where(eq(setlists.id, id))
      .limit(1);

    return rows[0] ? loadDetail(rows[0]) : null;
  }

  return {
    async listAll() {
      const rows = await database
        .select({
          id: setlists.id,
          title: setlists.title,
          createdAt: setlists.createdAt,
          updatedAt: setlists.updatedAt,
          songCount: count(setlistItems.id),
        })
        .from(setlists)
        .leftJoin(setlistItems, eq(setlistItems.setlistId, setlists.id))
        .groupBy(setlists.id)
        .orderBy(asc(setlists.title));

      return rows.map((row) => toSummary(row, row.songCount));
    },

    findById,

    async create(input) {
      const setlistId = await database.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(setlists)
          .values({ title: input.title })
          .returning({ id: setlists.id });

        if (input.songIds.length > 0) {
          await transaction.insert(setlistItems).values(
            input.songIds.map((songId, position) => ({
              setlistId: created.id,
              songId,
              position,
            })),
          );
        }

        return created.id;
      });
      const created = await findById(setlistId);

      if (!created) {
        throw new Error("Created setlist could not be reloaded.");
      }

      return created;
    },

    async update(id, input) {
      const exists = await database.transaction(async (transaction) => {
        const [updated] = await transaction
          .update(setlists)
          .set({ title: input.title, updatedAt: new Date() })
          .where(eq(setlists.id, id))
          .returning({ id: setlists.id });

        if (!updated) {
          return false;
        }

        const existingItems = await transaction
          .select({ id: setlistItems.id, songId: setlistItems.songId })
          .from(setlistItems)
          .where(eq(setlistItems.setlistId, id))
          .orderBy(asc(setlistItems.position));
        const existingBySongId = new Map<string, string[]>();

        for (const item of existingItems) {
          const items = existingBySongId.get(item.songId) ?? [];
          items.push(item.id);
          existingBySongId.set(item.songId, items);
        }

        const retainedItemIds = new Set<string>();
        const itemUpdates: Array<{ id: string; position: number }> = [];
        const itemInserts: Array<{ setlistId: string; songId: string; position: number }> = [];

        input.songIds.forEach((songId, position) => {
          const existingItemId = existingBySongId.get(songId)?.shift();

          if (existingItemId) {
            retainedItemIds.add(existingItemId);
            itemUpdates.push({ id: existingItemId, position });
          } else {
            itemInserts.push({ setlistId: id, songId, position });
          }
        });

        const removedItemIds = existingItems
          .map((item) => item.id)
          .filter((itemId) => !retainedItemIds.has(itemId));

        if (itemUpdates.length > 0) {
          await transaction
            .update(setlistItems)
            .set({ position: sql`${setlistItems.position} + ${existingItems.length + input.songIds.length}` })
            .where(eq(setlistItems.setlistId, id));

          for (const item of itemUpdates) {
            await transaction
              .update(setlistItems)
              .set({ position: item.position })
              .where(eq(setlistItems.id, item.id));
          }
        }

        if (removedItemIds.length > 0) {
          await transaction.delete(setlistItems).where(inArray(setlistItems.id, removedItemIds));
        }

        if (itemInserts.length > 0) {
          await transaction.insert(setlistItems).values(itemInserts);
        }

        return true;
      });

      return exists ? findById(id) : null;
    },

    async delete(id) {
      const deleted = await database
        .delete(setlists)
        .where(eq(setlists.id, id))
        .returning({ id: setlists.id });

      return deleted.length > 0;
    },

    async listPublishedSongIds(songIds) {
      if (songIds.length === 0) {
        return new Set();
      }

      const rows = await database
        .select({ id: songs.id })
        .from(songs)
        .where(
          and(
            publishedSongHasActiveSourceCondition,
            inArray(songs.id, Array.from(new Set(songIds))),
          ),
        );

      return new Set(rows.map((row) => row.id));
    },

    async listItemNotes(setlistId, userId) {
      const rows = await database
        .select({
          setlistItemId: setlistItems.id,
          teamContent: setlistItemTeamNotes.content,
          teamUpdatedAt: setlistItemTeamNotes.updatedAt,
          teamUpdatedByDisplayName: users.displayName,
          personalContent: setlistItemPersonalNotes.content,
        })
        .from(setlistItems)
        .leftJoin(
          setlistItemTeamNotes,
          eq(setlistItemTeamNotes.setlistItemId, setlistItems.id),
        )
        .leftJoin(users, eq(setlistItemTeamNotes.updatedByUserId, users.id))
        .leftJoin(
          setlistItemPersonalNotes,
          and(
            eq(setlistItemPersonalNotes.setlistItemId, setlistItems.id),
            eq(setlistItemPersonalNotes.userId, userId),
          ),
        )
        .where(eq(setlistItems.setlistId, setlistId));

      return rows.map((row) => ({
        setlistItemId: row.setlistItemId,
        teamNote: row.teamContent && row.teamUpdatedAt && row.teamUpdatedByDisplayName
          ? {
              content: row.teamContent,
              updatedAt: row.teamUpdatedAt,
              updatedByDisplayName: row.teamUpdatedByDisplayName,
            }
          : null,
        personalNote: row.personalContent,
      }));
    },

    async updateTeamNote(setlistId, setlistItemId, content, userId, userDisplayName) {
      const [item] = await database
        .select({ id: setlistItems.id })
        .from(setlistItems)
        .where(and(eq(setlistItems.id, setlistItemId), eq(setlistItems.setlistId, setlistId)))
        .limit(1);

      if (!item) return undefined;

      if (!content) {
        await database.delete(setlistItemTeamNotes).where(eq(setlistItemTeamNotes.setlistItemId, setlistItemId));
        return null;
      }

      const updatedAt = new Date();
      await database
        .insert(setlistItemTeamNotes)
        .values({ content, setlistItemId, updatedAt, updatedByUserId: userId })
        .onConflictDoUpdate({
          target: setlistItemTeamNotes.setlistItemId,
          set: { content, updatedAt, updatedByUserId: userId },
        });

      return { content, updatedAt, updatedByDisplayName: userDisplayName };
    },

    async updatePersonalNote(setlistId, setlistItemId, content, userId) {
      const [item] = await database
        .select({ id: setlistItems.id })
        .from(setlistItems)
        .where(and(eq(setlistItems.id, setlistItemId), eq(setlistItems.setlistId, setlistId)))
        .limit(1);

      if (!item) return undefined;

      if (!content) {
        await database
          .delete(setlistItemPersonalNotes)
          .where(and(eq(setlistItemPersonalNotes.setlistItemId, setlistItemId), eq(setlistItemPersonalNotes.userId, userId)));
        return null;
      }

      await database
        .insert(setlistItemPersonalNotes)
        .values({ content, setlistItemId, userId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [setlistItemPersonalNotes.setlistItemId, setlistItemPersonalNotes.userId],
          set: { content, updatedAt: new Date() },
        });

      return content;
    },
  };
}
