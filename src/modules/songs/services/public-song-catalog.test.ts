import { describe, expect, it } from "vitest";

import type { SongCatalogRepository } from "../repositories/song-catalog-repository";
import type { SongCatalogRecord } from "../types/public-song";
import {
  getPublicSongBySlug,
  isPublicSong,
  listPublicSongs,
} from "./public-song-catalog";

const publishedSong: SongCatalogRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Chant publié",
  slug: "chant-publie",
  status: "published",
  author: "Auteur",
  copyright: "© Exemple",
  defaultKey: "D",
  collection: "JEM",
  collectionNumber: 1,
  sourcePageUrl: "https://jemaf.fr/chant/jem001",
  pdfSource: null,
  chordProContent: "[D]Paroles",
};

const draftSong: SongCatalogRecord = {
  ...publishedSong,
  id: "22222222-2222-4222-8222-222222222222",
  title: "Brouillon",
  slug: "brouillon",
  status: "draft",
};

function createRepository(
  songs: SongCatalogRecord[],
): SongCatalogRepository {
  return {
    async listPublished() {
      return songs;
    },
    async findPublishedBySlug(slug) {
      return songs.find((song) => song.slug === slug) ?? null;
    },
    async findPublishedPdfBySlug(slug) {
      const song = songs.find((song) => song.slug === slug);
      return song?.pdfSource
        ? {
            ...song.pdfSource,
            storagePath: "songs/example/score.pdf",
          }
        : null;
    },
  };
}

describe("public song catalog", () => {
  it("only treats published songs as public", () => {
    expect(isPublicSong(publishedSong)).toBe(true);
    expect(isPublicSong(draftSong)).toBe(false);
  });

  it("excludes drafts and source content from the public list", async () => {
    const songs = await listPublicSongs(
      "",
      createRepository([publishedSong, draftSong]),
    );

    expect(songs).toEqual([
      {
        id: publishedSong.id,
        title: publishedSong.title,
        slug: publishedSong.slug,
        author: publishedSong.author,
        copyright: publishedSong.copyright,
        defaultKey: publishedSong.defaultKey,
        collection: publishedSong.collection,
        collectionNumber: publishedSong.collectionNumber,
        sourcePageUrl: publishedSong.sourcePageUrl,
        pdfSource: null,
      },
    ]);
    expect(songs[0]).not.toHaveProperty("chordProContent");
  });

  it("returns no public detail for a draft", async () => {
    const song = await getPublicSongBySlug(
      "brouillon",
      createRepository([draftSong]),
    );

    expect(song).toBeNull();
  });

  it("normalizes a slug before repository lookup", async () => {
    const song = await getPublicSongBySlug(
      "  CHANT-PUBLIE ",
      createRepository([publishedSong]),
    );

    expect(song?.slug).toBe("chant-publie");
  });
});
