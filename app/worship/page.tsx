import { SongsWorkspace } from "@/src/modules/songs/components/songs-workspace";
import { listPublicSongs } from "@/src/modules/songs/services/public-song-catalog";

export const dynamic = "force-dynamic";

type WorshipPageProps = {
  searchParams: Promise<{
    collections?: string;
    q?: string;
  }>;
};

export default async function WorshipPage({ searchParams }: WorshipPageProps) {
  const { collections, q } = await searchParams;
  const search = q?.trim() ?? "";
  const selectedCollections =
    collections
      ?.split(",")
      .map((collection) => collection.trim())
      .filter(Boolean) ?? [];
  const songs = await listPublicSongs();

  return (
    <SongsWorkspace
      initialCollections={selectedCollections}
      initialSearch={search}
      initialSongs={songs}
    />
  );
}
