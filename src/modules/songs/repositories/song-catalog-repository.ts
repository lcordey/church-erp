import {
  and,
  asc,
  count,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

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
  SongCatalogListRecord,
  SongCatalogRecord,
  SongMusicXmlFileSource,
  SongMusicXmlSource,
  SongPdfFileSource,
  SongPdfSource,
} from "../types/public-song";

type SongCatalogListOptions = {
  collections?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  themeIds?: string[];
  labelIds?: string[];
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
    songs: SongCatalogListRecord[];
    total: number;
  }>;
  findPublishedBySlug(slug: string): Promise<SongCatalogRecord | null>;
  findPublishedPdfBySlug(slug: string): Promise<SongPdfFileSource | null>;
  findPublishedMusicXmlBySlug(
    slug: string,
  ): Promise<SongMusicXmlFileSource | null>;
}

export interface PublishedSongCollectionRepository {
  listPublishedCollections(): Promise<string[]>;
  listPublishedTaxonomies(): Promise<{
    themes: { id: string; name: string }[];
    labels: { id: string; name: string }[];
  }>;
}

const listSelection = {
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

function toCatalogRecord(
  row: Omit<SongCatalogRecord, "chordProContent"> & {
    chordProContent: string | null;
    pdfSource?: SongPdfSource | null;
    musicXmlSource?: SongMusicXmlSource | null;
  },
): SongCatalogRecord {
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
  const chordProSources = alias(songSources, "published_song_chordpro_sources");
  const pdfSources = alias(songSources, "published_song_pdf_sources");
  const musicXmlSources = alias(songSources, "published_song_musicxml_sources");
  const publishedSongCondition = eq(songs.status, "published");
  const publishedSongHasActiveSourceCondition = and(
    publishedSongCondition,
    exists(
      database
        .select({ value: sql`1` })
        .from(songSources)
        .where(and(eq(songSources.songId, songs.id), eq(songSources.status, "active"))),
    ),
  );
  const activePdfCondition = and(
    eq(songSources.sourceType, "pdf"),
    eq(songSources.status, "active"),
  );
  const activeMusicXmlCondition = and(
    eq(songSources.sourceType, "musicxml"),
    eq(songSources.status, "active"),
  );

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
    const selectedThemeIds = options?.themeIds?.filter(Boolean) ?? [];
    const selectedLabelIds = options?.labelIds?.filter(Boolean) ?? [];
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
    const themeCondition =
      selectedThemeIds.length > 0
        ? exists(
            database
              .select({ value: sql`1` })
              .from(songThemeAssignments)
              .where(
                and(
                  eq(songThemeAssignments.songId, songs.id),
                  inArray(songThemeAssignments.themeId, selectedThemeIds),
                ),
              ),
          )
        : undefined;
    const labelCondition =
      selectedLabelIds.length > 0
        ? exists(
            database
              .select({ value: sql`1` })
              .from(songLabelAssignments)
              .where(
                and(
                  eq(songLabelAssignments.songId, songs.id),
                  inArray(songLabelAssignments.labelId, selectedLabelIds),
                ),
              ),
          )
        : undefined;

    return and(
      publishedSongHasActiveSourceCondition,
      searchCondition,
      collectionCondition,
      themeCondition,
      labelCondition,
    );
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

        const [rows, totalRows] = await Promise.all([
          database
            .select(listSelection)
            .from(songs)
            .where(listCondition)
            .orderBy(
              sql`${songs.collection} is null`,
              asc(songs.collection),
              asc(songs.collectionNumber),
              asc(songs.title),
              asc(songs.slug),
            )
            .limit(limit)
            .offset(offset),
          database
            .select({ value: count() })
            .from(songs)
            .where(listCondition),
        ]);

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

      return {
        songs: queryResult.rows,
        total: queryResult.totalRows[0]?.value ?? 0,
      };
    },

    async findPublishedBySlug(slug) {
      const rows = await database
        .select({
          ...listSelection,
          chordProContent: chordProSources.textContent,
          pdfStoragePath: pdfSources.storagePath,
          pdfFileName: pdfSources.fileName,
          pdfMimeType: pdfSources.mimeType,
          pdfFileSizeBytes: pdfSources.fileSizeBytes,
          musicXmlId: musicXmlSources.id,
          musicXmlFileName: musicXmlSources.fileName,
          musicXmlMimeType: musicXmlSources.mimeType,
          musicXmlFileSizeBytes: musicXmlSources.fileSizeBytes,
        })
        .from(songs)
        .leftJoin(
          chordProSources,
          and(
            eq(chordProSources.songId, songs.id),
            eq(chordProSources.sourceType, "chordpro"),
            eq(chordProSources.status, "active"),
          ),
        )
        .leftJoin(
          pdfSources,
          and(
            eq(pdfSources.songId, songs.id),
            eq(pdfSources.sourceType, "pdf"),
            eq(pdfSources.status, "active"),
          ),
        )
        .leftJoin(
          musicXmlSources,
          and(
            eq(musicXmlSources.songId, songs.id),
            eq(musicXmlSources.sourceType, "musicxml"),
            eq(musicXmlSources.status, "active"),
          ),
        )
        .where(and(publishedSongHasActiveSourceCondition, eq(songs.slug, slug)))
        .limit(1);

      const row = rows[0];

      if (!row) {
        return null;
      }

      return toCatalogRecord({
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        author: row.author,
        copyright: row.copyright,
        defaultKey: row.defaultKey,
        collection: row.collection,
        collectionNumber: row.collectionNumber,
        sourcePageUrl: row.sourcePageUrl,
        chordProContent: row.chordProContent,
        pdfSource: row.pdfStoragePath
          ? toPublicPdfSource(
              toPdfSource({
                songId: row.id,
                slug: row.slug,
                storagePath: row.pdfStoragePath,
                fileName: row.pdfFileName,
                mimeType: row.pdfMimeType,
                fileSizeBytes: row.pdfFileSizeBytes,
              }),
            )
          : null,
        musicXmlSource: row.musicXmlId
          ? toMusicXmlSource({
              songId: row.id,
              slug: row.slug,
              fileName: row.musicXmlFileName,
              mimeType: row.musicXmlMimeType,
              fileSizeBytes: row.musicXmlFileSizeBytes,
            })
          : null,
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

    async findPublishedMusicXmlBySlug(slug) {
      const rows = await database
        .select(musicXmlFileSelection)
        .from(songSources)
        .innerJoin(songs, eq(songSources.songId, songs.id))
        .where(
          and(
            eq(songs.status, "published"),
            eq(songs.slug, slug),
            activeMusicXmlCondition,
          ),
        )
        .limit(1);

      return rows[0] ? toMusicXmlFileSource(rows[0]) : null;
    },
  };
}

export function createPublishedSongCollectionRepository(): PublishedSongCollectionRepository {
  const database = getDatabase();
  const publishedSongCondition = and(
    eq(songs.status, "published"),
    exists(
      database
        .select({ value: sql`1` })
        .from(songSources)
        .where(and(eq(songSources.songId, songs.id), eq(songSources.status, "active"))),
    ),
  );

  return {
    async listPublishedCollections() {
      const collectionRows = await database
        .selectDistinct({ collection: songs.collection })
        .from(songs)
        .where(publishedSongCondition)
        .orderBy(asc(songs.collection));

      return collectionRows
        .map((row) => row.collection)
        .filter((collection): collection is string => Boolean(collection));
    },

    async listPublishedTaxonomies() {
      const [themes, labels] = await Promise.all([
        database
          .selectDistinct({ id: songThemes.id, name: songThemes.name })
          .from(songThemes)
          .innerJoin(
            songThemeAssignments,
            eq(songThemeAssignments.themeId, songThemes.id),
          )
          .innerJoin(songs, eq(songThemeAssignments.songId, songs.id))
          .where(publishedSongCondition)
          .orderBy(asc(songThemes.name)),
        database
          .selectDistinct({ id: songLabels.id, name: songLabels.name })
          .from(songLabels)
          .innerJoin(
            songLabelAssignments,
            eq(songLabelAssignments.labelId, songLabels.id),
          )
          .innerJoin(songs, eq(songLabelAssignments.songId, songs.id))
          .where(publishedSongCondition)
          .orderBy(asc(songLabels.name)),
      ]);

      return { themes, labels };
    },
  };
}
