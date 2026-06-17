export type SongPublicationStatus = "draft" | "published";

export type SongPdfSource = {
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  downloadUrl: string;
};

export type SongPdfFileSource = SongPdfSource & {
  storagePath: string;
};

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
  pdfSource: SongPdfSource | null;
};

export type PublicSongDetail = PublicSongSummary & {
  chordProContent: string;
};

export type SongCatalogRecord = PublicSongDetail & {
  status: SongPublicationStatus;
};
