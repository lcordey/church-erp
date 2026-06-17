import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  songs,
  songSources,
} from "@/src/infrastructure/database/schema";

import type {
  SongCatalogRecord,
  SongPdfFileSource,
  SongPdfSource,
} from "../types/public-song";

export interface SongCatalogRepository {
  listPublished(search?: string): Promise<SongCatalogRecord[]>;
  findPublishedBySlug(slug: string): Promise<SongCatalogRecord | null>;
  findPublishedPdfBySlug(slug: string): Promise<SongPdfFileSource | null>;
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

const pdfSelection = {
  songId: songSources.songId,
  slug: songs.slug,
  storagePath: songSources.storagePath,
  fileName: songSources.fileName,
  mimeType: songSources.mimeType,
  fileSizeBytes: songSources.fileSizeBytes,
};

type PdfSelectionRow = {
  songId: string;
  slug: string;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
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

function toPublicPdfSource(source: SongPdfFileSource | null): SongPdfSource | null {
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

function toCatalogRecord(
  row: Omit<SongCatalogRecord, "chordProContent"> & {
    chordProContent: string | null;
    pdfSource?: SongPdfSource | null;
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
  const activePdfCondition = and(
    eq(songSources.sourceType, "pdf"),
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
      .where(and(activePdfCondition, inArray(songSources.songId, songIds)));

    return new Map(
      rows.flatMap((row) => {
        const source = toPublicPdfSource(toPdfSource(row));
        return source ? [[row.songId, source]] : [];
      }),
    );
  }

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

      const pdfSources = await findActivePdfSources(
        rows.map((row) => row.id),
      );

      return rows.map((row) =>
        toCatalogRecord({
          ...row,
          pdfSource: pdfSources.get(row.id) ?? null,
        }),
      );
    },

    async findPublishedBySlug(slug) {
      const rows = await database
        .select(selection)
        .from(songs)
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(and(publishedSongCondition, eq(songs.slug, slug)))
        .limit(1);

      if (!rows[0]) {
        return null;
      }

      const pdfSources = await findActivePdfSources([rows[0].id]);

      return toCatalogRecord({
        ...rows[0],
        pdfSource: pdfSources.get(rows[0].id) ?? null,
      });
    },

    async findPublishedPdfBySlug(slug) {
      const rows = await database
        .select(pdfSelection)
        .from(songSources)
        .innerJoin(songs, eq(songSources.songId, songs.id))
        .where(and(eq(songs.status, "published"), eq(songs.slug, slug), activePdfCondition))
        .limit(1);

      return rows[0] ? toPdfSource(rows[0]) : null;
    },
  };
}
