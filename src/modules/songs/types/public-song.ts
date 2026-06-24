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

export type SongMusicXmlSource = {
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  downloadUrl: string;
};

export type SongMusicXmlFileSource = SongMusicXmlSource & {
  content: string;
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
};

export type PublicSongCatalogResults = {
  songs: PublicSongSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type PublicSongCatalogPage = PublicSongCatalogResults & {
  collections: string[];
};

export type PublicSongDetail = PublicSongSummary & {
  chordProContent: string;
  pdfSource: SongPdfSource | null;
  musicXmlSource: SongMusicXmlSource | null;
};

export type SongCatalogListRecord = PublicSongSummary & {
  status: SongPublicationStatus;
};

export type SongCatalogRecord = PublicSongDetail & {
  status: SongPublicationStatus;
};
