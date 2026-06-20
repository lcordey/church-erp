import {
  createSongCatalogRepository,
  type SongCatalogRepository,
} from "../repositories/song-catalog-repository";
import type {
  PublicSongCatalogPage,
  PublicSongDetail,
  PublicSongSummary,
  SongCatalogRecord,
  SongPdfFileSource,
} from "../types/public-song";

export const PUBLIC_SONG_PAGE_SIZE = 20;
const MAX_PUBLIC_SONG_PAGE_SIZE = 50;

export type PublicSongCatalogQuery = {
  collections?: string[];
  limit?: number;
  offset?: number;
  search?: string;
};

export function isPublicSong(
  song: Pick<SongCatalogRecord, "status">,
): boolean {
  return song.status === "published";
}

function toSummary(song: SongCatalogRecord): PublicSongSummary {
  return {
    id: song.id,
    title: song.title,
    slug: song.slug,
    author: song.author,
    copyright: song.copyright,
    defaultKey: song.defaultKey,
    collection: song.collection,
    collectionNumber: song.collectionNumber,
    sourcePageUrl: song.sourcePageUrl,
    pdfSource: song.pdfSource,
  };
}

function toDetail(song: SongCatalogRecord): PublicSongDetail {
  return {
    ...toSummary(song),
    chordProContent: song.chordProContent,
  };
}

export async function listPublicSongs(
  query: PublicSongCatalogQuery | string = {},
  repository: SongCatalogRepository = createSongCatalogRepository(),
): Promise<PublicSongCatalogPage> {
  const options =
    typeof query === "string" ? { search: query } : query;
  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? PUBLIC_SONG_PAGE_SIZE), 1),
    MAX_PUBLIC_SONG_PAGE_SIZE,
  );
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);
  const result = await repository.listPublished({
    collections: options.collections?.map((collection) => collection.trim()).filter(Boolean),
    limit,
    offset,
    search: options.search?.trim() ?? "",
  });
  const songs = result.songs.filter(isPublicSong).map(toSummary);

  return {
    songs,
    total: result.total,
    limit,
    offset,
    hasMore: offset + songs.length < result.total,
    collections: result.collections,
  };
}

export async function getPublicSongBySlug(
  slug: string,
  repository: SongCatalogRepository = createSongCatalogRepository(),
): Promise<PublicSongDetail | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const song = await repository.findPublishedBySlug(normalizedSlug);

  return song && isPublicSong(song) ? toDetail(song) : null;
}

export async function getPublicSongPdfBySlug(
  slug: string,
  repository: SongCatalogRepository = createSongCatalogRepository(),
): Promise<SongPdfFileSource | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  return repository.findPublishedPdfBySlug(normalizedSlug);
}
