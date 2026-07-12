import type { PublicSongDetail } from "@/src/modules/songs/types/public-song";

export type SetlistSummary = {
  id: string;
  title: string;
  songCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SetlistItem = {
  id: string;
  position: number;
  song: PublicSongDetail;
};

export type SetlistDetail = SetlistSummary & {
  items: SetlistItem[];
};

export type SetlistInput = {
  title: string;
  songIds: string[];
};

export type SetlistTeamNote = {
  content: string;
  updatedAt: Date;
  updatedByDisplayName: string;
};

export type SetlistItemNotes = {
  setlistItemId: string;
  teamNote: SetlistTeamNote | null;
  personalNote: string | null;
};
