type OfficialSongCandidate = {
  collection: string | null;
  sourcePageUrl: string | null;
};

const localSongCollection = "LeMont";

export function hasLockedOfficialMetadata(song: OfficialSongCandidate): boolean {
  return song.collection !== localSongCollection && Boolean(song.sourcePageUrl);
}
