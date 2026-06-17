import type { SongPublicationStatus } from "./public-song";

export type AdminSong = {
  id: string;
  title: string;
  slug: string;
  status: SongPublicationStatus;
  author: string | null;
  copyright: string | null;
  defaultKey: string | null;
  collection: string | null;
  collectionNumber: number | null;
  sourcePageUrl: string | null;
  sourceChordProUrl: string | null;
  isEditable: boolean;
  chordProContent: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminSongInput = {
  title: string;
  slug: string;
  author: string | null;
  copyright: string | null;
  defaultKey: string | null;
  chordProContent: string;
};

export type AdminSongListItem = Omit<AdminSong, "chordProContent">;
