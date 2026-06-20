import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

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

type SongCatalogListOptions = {
  collections?: string[];
  limit?: number;
  offset?: number;
  search?: string;
};

export function getSongCatalogIdentifierSearch(
  search: string,
): string | null {
  const normalizedSearch = search.trim().toLowerCase();
  const compactSearch = normalizedSearch.replace(/[^a-z0-9]+/g, "");

  return /\d/.test(compactSearch) ? compactSearch : null;
}

export interface SongCatalogRepository {
  listPublished(options?: SongCatalogListOptions): Promise<{
    songs: SongCatalogRecord[];
    total: number;
  }>;
  findPublishedBySlug(slug: string): Promise<SongCatalogRecord | null>;
  findPublishedPdfBySlug(slug: string): Promise<SongPdfFileSource | null>;
}

export interface PublishedSongCollectionRepository {
  listPublishedCollections(): Promise<string[]>;
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

function isMissingUnaccentError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /unaccent/i.test(error.message);
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

  function buildListCondition(
    options: SongCatalogListOptions | undefined,
    accentInsensitiveTitleSearch: boolean,
  ) {
    const normalizedSearch = options?.search?.trim();
    const normalizedSearchLower = normalizedSearch?.toLowerCase();
    const identifierSearch = normalizedSearch
      ? getSongCatalogIdentifierSearch(normalizedSearch)
      : null;
    const selectedCollections = options?.collections?.filter(Boolean) ?? [];
    const searchCondition = normalizedSearch
      ? or(
          accentInsensitiveTitleSearch
            ? sql`immutable_unaccent(lower(${songs.title})) like concat('%', immutable_unaccent(${normalizedSearchLower ?? ""}), '%')`
            : ilike(songs.title, `%${normalizedSearch}%`),
          ilike(
            sql`cast(${songs.collectionNumber} as text)`,
            normalizedSearch,
          ),
          ilike(
            sql`lpad(cast(${songs.collectionNumber} as text), 3, '0')`,
            normalizedSearch,
          ),
          ...(identifierSearch
            ? [
                ilike(
                  sql`regexp_replace(lower(concat(${songs.collection}, cast(${songs.collectionNumber} as text))), '[^a-z0-9]+', '', 'g')`,
                  `${identifierSearch}%`,
                ),
                ilike(
                  sql`regexp_replace(lower(concat(${songs.collection}, lpad(cast(${songs.collectionNumber} as text), 3, '0'))), '[^a-z0-9]+', '', 'g')`,
                  `${identifierSearch}%`,
                ),
              ]
            : []),
        )
      : undefined;
    const collectionCondition =
      selectedCollections.length > 0
        ? inArray(songs.collection, selectedCollections)
        : undefined;

    return and(publishedSongCondition, searchCondition, collectionCondition);
  }

  return {
    async listPublished(options) {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;
      const runListQuery = async (accentInsensitiveTitleSearch: boolean) => {
        const listCondition = buildListCondition(
          options,
          accentInsensitiveTitleSearch,
        );

        const rows = await database
          .select(selection)
          .from(songs)
          .innerJoin(songSources, eq(songSources.songId, songs.id))
          .where(listCondition)
          .orderBy(
            sql`${songs.collection} is null`,
            asc(songs.collection),
            asc(songs.collectionNumber),
            asc(songs.title),
          )
          .limit(limit)
          .offset(offset);
        const totalRows = await database
          .select({ value: count() })
          .from(songs)
          .innerJoin(songSources, eq(songSources.songId, songs.id))
          .where(listCondition);

        return {
          rows,
          totalRows,
        };
      };

      let queryResult;

      try {
        queryResult = await runListQuery(true);
      } catch (error) {
        if (!isMissingUnaccentError(error)) {
          throw error;
        }

        queryResult = await runListQuery(false);
      }

      const pdfSources = await findActivePdfSources(
        queryResult.rows.map((row) => row.id),
      );

      return {
        songs: queryResult.rows.map((row) =>
          toCatalogRecord({
            ...row,
            pdfSource: pdfSources.get(row.id) ?? null,
          }),
        ),
        total: queryResult.totalRows[0]?.value ?? 0,
      };
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

export function createPublishedSongCollectionRepository(): PublishedSongCollectionRepository {
  const database = getDatabase();
  const publishedSongCondition = and(
    eq(songs.status, "published"),
    eq(songSources.sourceType, "chordpro"),
    eq(songSources.status, "active"),
  );

  return {
    async listPublishedCollections() {
      const collectionRows = await database
        .selectDistinct({ collection: songs.collection })
        .from(songs)
        .innerJoin(songSources, eq(songSources.songId, songs.id))
        .where(publishedSongCondition)
        .orderBy(asc(songs.collection));

      return collectionRows
        .map((row) => row.collection)
        .filter((collection): collection is string => Boolean(collection));
    },
  };
}
