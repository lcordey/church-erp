import { and, asc, eq, ilike, or, sql } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  songs,
  songSources,
} from "@/src/infrastructure/database/schema";

import type { SongCatalogRecord } from "../types/public-song";

export interface SongCatalogRepository {
  listPublished(search?: string): Promise<SongCatalogRecord[]>;
  findPublishedBySlug(slug: string): Promise<SongCatalogRecord | null>;
}

const selection = {
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
  chordProContent: songSources.textContent,
};

function toCatalogRecord(
  row: Omit<SongCatalogRecord, "chordProContent"> & {
    chordProContent: string | null;
  },
): SongCatalogRecord {
  if (!row.chordProContent) {
    throw new Error(`Published song "${row.slug}" has no active ChordPro source.`);
  }

  return {
    ...row,
    chordProContent: row.chordProContent,
  };
}

export function createSongCatalogRepository(): SongCatalogRepository {
  const database = getDatabase();
  const publishedSongCondition = and(
    eq(songs.status, "published"),
    eq(songSources.sourceType, "chordpro"),
    eq(songSources.status, "active"),
  );

  return {
    async listPublished(search) {
      const normalizedSearch = search?.trim();
      const searchCondition = normalizedSearch
        ? or(
            ilike(songs.title, `%${normalizedSearch}%`),
            ilike(
              sql`concat(${songs.collection}, ' ', ${songs.collectionNumber})`,
              `%${normalizedSearch}%`,
            ),
            ilike(
              sql`cast(${songs.collectionNumber} as text)`,
              normalizedSearch,
            ),
            ilike(
              sql`lpad(cast(${songs.collectionNumber} as text), 3, '0')`,
              normalizedSearch,
            ),
          )
        : undefined;

      const rows = await database
        .select(selection)
        .from(songs)
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(
          searchCondition
            ? and(publishedSongCondition, searchCondition)
            : publishedSongCondition,
        )
        .orderBy(
          sql`${songs.collection} is null`,
          asc(songs.collection),
          asc(songs.collectionNumber),
          asc(songs.title),
        );

      return rows.map(toCatalogRecord);
    },

    async findPublishedBySlug(slug) {
      const rows = await database
        .select(selection)
        .from(songs)
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(and(publishedSongCondition, eq(songs.slug, slug)))
        .limit(1);

      return rows[0] ? toCatalogRecord(rows[0]) : null;
    },
  };
}
