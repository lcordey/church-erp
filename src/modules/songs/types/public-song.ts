export type SongPublicationStatus = "draft" | "published";

export type PublicSongSummary = {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  copyright: string | null;
  defaultKey: string | null;
  collection: string | null;
  collectionNumber: number | null;
  sourcePageUrl: string | null;
};

export type PublicSongDetail = PublicSongSummary & {
  chordProContent: string;
};

export type SongCatalogRecord = PublicSongDetail & {
  status: SongPublicationStatus;
};
