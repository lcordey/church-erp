import { SongsWorkspace } from "@/src/modules/songs/components/songs-workspace";
import { listPublicSongs } from "@/src/modules/songs/services/public-song-catalog";

export const dynamic = "force-dynamic";

const defaultVisibleCollections = ["JEM", "JEMK", "LeMont"];

type WorshipPageProps = {
  searchParams: Promise<{
    collections?: string;
    q?: string;
  }>;
};

export default async function WorshipPage({ searchParams }: WorshipPageProps) {
  const { collections, q } = await searchParams;
  const search = q?.trim() ?? "";
  const songs = await listPublicSongs();
  const availableCollections = new Set(
    songs.map((song) => song.collection).filter(Boolean),
  );
  const selectedCollections = collections
    ? collections
        .split(",")
        .map((collection) => collection.trim())
        .filter(Boolean)
    : defaultVisibleCollections.filter((collection) =>
        availableCollections.has(collection),
      );

  return (
    <SongsWorkspace
      initialCollections={selectedCollections}
      initialSearch={search}
      initialSongs={songs}
    />
  );
}
