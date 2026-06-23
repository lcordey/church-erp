import { and, asc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  setlistItems,
  setlists,
  songs,
  songSources,
} from "@/src/infrastructure/database/schema";
import type {
  PublicSongDetail,
  SongMusicXmlSource,
  SongPdfSource,
} from "@/src/modules/songs/types/public-song";

import type { SetlistDetail, SetlistInput, SetlistSummary } from "../types/setlist";

export interface SetlistRepository {
  listAll(): Promise<SetlistSummary[]>;
  findById(id: string): Promise<SetlistDetail | null>;
  create(input: SetlistInput): Promise<SetlistDetail>;
  update(id: string, input: SetlistInput): Promise<SetlistDetail | null>;
  delete(id: string): Promise<boolean>;
  listPublishedSongIds(songIds: string[]): Promise<Set<string>>;
}

const activeChordProCondition = and(
  eq(songSources.sourceType, "chordpro"),
  eq(songSources.status, "active"),
);
const activePdfCondition = and(
  eq(songSources.sourceType, "pdf"),
  eq(songSources.status, "active"),
);
const activeMusicXmlCondition = and(
  eq(songSources.sourceType, "musicxml"),
  eq(songSources.status, "active"),
);
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
  chordProContent: songSources.textContent,
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
  if (!row.chordProContent) {
    throw new Error(`Published song "${row.slug}" has no active ChordPro source.`);
  }

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
    pdfSource,
    musicXmlSource,
    chordProContent: row.chordProContent,
  };
}

export function createSetlistRepository(): SetlistRepository {
  const database = getDatabase();

  async function findActivePdfSources(songIds: string[]) {
    if (songIds.length === 0) {
      return new Map<string, SongPdfSource>();
    }

    const rows = await database
      .select({
        songId: songSources.songId,
        slug: songs.slug,
        fileName: songSources.fileName,
        mimeType: songSources.mimeType,
        fileSizeBytes: songSources.fileSizeBytes,
        storagePath: songSources.storagePath,
      })
      .from(songSources)
      .innerJoin(songs, eq(songSources.songId, songs.id))
      .where(
        and(activePdfCondition, inArray(songSources.songId, songIds)),
      );

    return new Map(
      rows.flatMap((row) => {
        const source = toPdfSource(row);
        return source ? [[row.songId, source]] : [];
      }),
    );
  }

  async function findActiveMusicXmlSources(songIds: string[]) {
    if (songIds.length === 0) {
      return new Map<string, SongMusicXmlSource>();
    }

    const rows = await database
      .select({
        songId: songSources.songId,
        slug: songs.slug,
        fileName: songSources.fileName,
        mimeType: songSources.mimeType,
        fileSizeBytes: songSources.fileSizeBytes,
      })
      .from(songSources)
      .innerJoin(songs, eq(songSources.songId, songs.id))
      .where(
        and(activeMusicXmlCondition, inArray(songSources.songId, songIds)),
      );

    return new Map(
      rows.map((row) => [row.songId, toMusicXmlSource(row)]),
    );
  }

  async function loadDetail(row: SetlistRow): Promise<SetlistDetail> {
    const itemRows = await database
      .select(setlistItemSelection)
      .from(setlistItems)
      .innerJoin(songs, eq(setlistItems.songId, songs.id))
      .innerJoin(songSources, eq(songSources.songId, songs.id))
      .where(
        and(
          eq(setlistItems.setlistId, row.id),
          publishedSongCondition,
          activeChordProCondition,
        ),
      )
      .orderBy(asc(setlistItems.position));
    const pdfSources = await findActivePdfSources(itemRows.map((item) => item.id));
    const musicXmlSources = await findActiveMusicXmlSources(
      itemRows.map((item) => item.id),
    );

    return {
      ...toSummary(row, itemRows.length),
      items: itemRows.map((item) => ({
        id: item.itemId,
        position: item.position,
        song: toSongDetail(
          item,
          pdfSources.get(item.id) ?? null,
          musicXmlSources.get(item.id) ?? null,
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
        .select()
        .from(setlists)
        .orderBy(asc(setlists.title));
      const counts = await database
        .select({
          setlistId: setlistItems.setlistId,
          itemId: setlistItems.id,
        })
        .from(setlistItems);
      const countBySetlist = counts.reduce((accumulator, item) => {
        accumulator.set(
          item.setlistId,
          (accumulator.get(item.setlistId) ?? 0) + 1,
        );
        return accumulator;
      }, new Map<string, number>());

      return rows.map((row) => toSummary(row, countBySetlist.get(row.id) ?? 0));
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

        await transaction.delete(setlistItems).where(eq(setlistItems.setlistId, id));

        if (input.songIds.length > 0) {
          await transaction.insert(setlistItems).values(
            input.songIds.map((songId, position) => ({
              setlistId: id,
              songId,
              position,
            })),
          );
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
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(
          and(
            publishedSongCondition,
            activeChordProCondition,
            inArray(songs.id, Array.from(new Set(songIds))),
          ),
        );

      return new Set(rows.map((row) => row.id));
    },
  };
}
