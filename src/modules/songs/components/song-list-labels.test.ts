import { describe, expect, it } from "vitest";

import type { PublicSongSummary } from "../types/public-song";
import {
  formatSongCatalogTitle,
  formatSongCollectionAndAuthor,
} from "./song-list-labels";

const song: PublicSongSummary = {
  author: "Collectif Cieux Ouverts",
  collection: "JEM",
  collectionNumber: 42,
  copyright: null,
  defaultKey: null,
  id: "song-id",
  slug: "grace-infinie",
  sourcePageUrl: null,
  title: "Grâce infinie",
};

describe("song list labels", () => {
  it("combines collection and title for catalog entries", () => {
    expect(formatSongCatalogTitle(song)).toBe(
      "J'aime l'Eternel 042 · Grâce infinie",
    );
  });

  it("combines collection and author for setlist metadata", () => {
    expect(formatSongCollectionAndAuthor(song)).toBe(
      "J'aime l'Eternel 042 · Collectif Cieux Ouverts",
    );
  });
});
