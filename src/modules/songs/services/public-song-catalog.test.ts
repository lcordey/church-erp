import { describe, expect, it } from "vitest";

import type {
  PublishedSongCollectionRepository,
  SongCatalogRepository,
} from "../repositories/song-catalog-repository";
import type { SongCatalogRecord } from "../types/public-song";
import {
  getPublicSongBySlug,
  isPublicSong,
  listPublicSongResults,
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
    async listPublished(options) {
      const limit = options?.limit ?? songs.length;
      const offset = options?.offset ?? 0;
      const filteredSongs = songs.filter((song) => {
        if (song.status !== "published") {
          return false;
        }

        const matchesCollection =
          !options?.collections?.length ||
          Boolean(song.collection && options.collections.includes(song.collection));
        const matchesSearch =
          !options?.search ||
          song.title.toLowerCase().includes(options.search.toLowerCase());

        return matchesCollection && matchesSearch;
      });

      return {
        songs: filteredSongs.slice(offset, offset + limit),
        total: filteredSongs.length,
      };
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

function createCollectionRepository(
  songs: SongCatalogRecord[],
): PublishedSongCollectionRepository {
  return {
    async listPublishedCollections() {
      return Array.from(
        new Set(
          songs
            .filter((song) => song.status === "published")
            .map((song) => song.collection)
            .filter(Boolean),
        ),
      ) as string[];
    },
  };
}

describe("public song catalog", () => {
  it("only treats published songs as public", () => {
    expect(isPublicSong(publishedSong)).toBe(true);
    expect(isPublicSong(draftSong)).toBe(false);
  });

  it("excludes drafts and source content from the public list", async () => {
    const catalog = await listPublicSongs(
      {},
      createRepository([publishedSong, draftSong]),
      createCollectionRepository([publishedSong, draftSong]),
    );

    expect(catalog.songs).toEqual([
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
    expect(catalog.songs[0]).not.toHaveProperty("chordProContent");
    expect(catalog).toMatchObject({
      hasMore: false,
      limit: 20,
      offset: 0,
      total: 1,
    });
  });

  it("passes pagination and filter options to the repository", async () => {
    const catalog = await listPublicSongResults(
      {
        collections: ["JEM"],
        limit: 1,
        offset: 0,
        search: "publié",
      },
      createRepository([
        publishedSong,
        {
          ...publishedSong,
          id: "33333333-3333-4333-8333-333333333333",
          title: "Autre chant",
          slug: "autre-chant",
        },
      ]),
    );

    expect(catalog.songs).toHaveLength(1);
    expect(catalog.total).toBe(1);
    expect(catalog.hasMore).toBe(false);
  });

  it("bounds public page size", async () => {
    const catalog = await listPublicSongResults(
      { limit: 500 },
      createRepository([publishedSong]),
    );

    expect(catalog.limit).toBe(50);
  });

  it("keeps collection lookup out of paginated result queries", async () => {
    let collectionQueryCount = 0;
    const collectionRepository: PublishedSongCollectionRepository = {
      async listPublishedCollections() {
        collectionQueryCount += 1;
        return ["JEM"];
      },
    };

    await listPublicSongResults({}, createRepository([publishedSong]));
    await listPublicSongResults(
      { collections: ["JEM"], search: "chant" },
      createRepository([publishedSong]),
    );

    expect(collectionQueryCount).toBe(0);

    const catalog = await listPublicSongs(
      {},
      createRepository([publishedSong]),
      collectionRepository,
    );

    expect(catalog.collections).toEqual(["JEM"]);
    expect(collectionQueryCount).toBe(1);
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
