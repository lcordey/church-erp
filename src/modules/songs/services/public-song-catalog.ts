import {
  createSongCatalogRepository,
  type SongCatalogRepository,
} from "../repositories/song-catalog-repository";
import type {
  PublicSongDetail,
  PublicSongSummary,
  SongCatalogRecord,
  SongPdfFileSource,
} from "../types/public-song";

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
  search = "",
  repository: SongCatalogRepository = createSongCatalogRepository(),
): Promise<PublicSongSummary[]> {
  const songs = await repository.listPublished(search);

  return songs.filter(isPublicSong).map(toSummary);
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
