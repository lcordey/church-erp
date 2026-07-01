import { SongsWorkspace } from "@/src/modules/songs/components/songs-workspace";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { PUBLIC_SONG_PAGE_SIZE } from "@/src/modules/songs/services/public-song-catalog";
import type { PublicSongCatalogPage } from "@/src/modules/songs/types/public-song";

const defaultVisibleCollections = ["JEM", "JEMK", "LeMont", "Glorious"];
const emptyCatalog: PublicSongCatalogPage = {
  songs: [],
  total: 0,
  limit: PUBLIC_SONG_PAGE_SIZE,
  offset: 0,
  hasMore: false,
  collections: defaultVisibleCollections,
  themes: [],
  labels: [],
};

type WorshipPageProps = {
  searchParams: Promise<{
    collections?: string;
    q?: string;
    themes?: string;
    labels?: string;
  }>;
};

export default async function WorshipPage({ searchParams }: WorshipPageProps) {
  const [{ collections, q, themes, labels }, actor] = await Promise.all([
    searchParams,
    getCurrentActor(),
  ]);
  const search = q?.trim() ?? "";
  const selectedCollections = collections
    ? collections
        .split(",")
        .map((collection) => collection.trim())
        .filter(Boolean)
    : defaultVisibleCollections;

  return (
    <SongsWorkspace
      initialCollections={selectedCollections}
      initialSearch={search}
      initialThemeIds={themes?.split(",").filter(Boolean)}
      initialLabelIds={labels?.split(",").filter(Boolean)}
      initialCatalog={emptyCatalog}
      isAuthenticated={actor !== null}
      loadCatalogOnMount
    />
  );
}
