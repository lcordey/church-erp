import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SongPageWorkspace } from "@/src/modules/songs/components/song-page-workspace";
import { getAdminSong } from "@/src/modules/songs/services/admin-song-management";
import { getPublicSongBySlug } from "@/src/modules/songs/services/public-song-catalog";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";
import { listAdminSongTaxonomies } from "@/src/modules/songs/services/song-taxonomy-management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chant · ChurchERP",
  description: "Paroles et accords d'un chant publié.",
};

type SongPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string; returnTo?: string }>;
};

export default async function SongPage({ params, searchParams }: SongPageProps) {
  const { slug } = await params;
  const { mode, returnTo } = await searchParams;
  const actor = await getCurrentActor();
  const isAuthenticated = actor !== null;
  const backHref =
    typeof returnTo === "string" && returnTo.startsWith("/worship")
      ? returnTo
      : "/worship";

  if (mode === "edition" && !isAuthenticated) {
    const editionUrl = new URL(`/chants/${slug}`, "http://localhost");
    editionUrl.searchParams.set("mode", "edition");

    if (backHref !== "/worship") {
      editionUrl.searchParams.set("returnTo", backHref);
    }

    redirect(getLoginHref(`${editionUrl.pathname}${editionUrl.search}`));
  }

  const song = await getPublicSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const [adminSong, availableTaxonomies] = isAuthenticated && mode === "edition"
    ? await Promise.all([
        getAdminSong(song.id),
        listAdminSongTaxonomies(),
      ])
    : [null, { themes: [], labels: [] }];

  return (
    <SongPageWorkspace
      adminSong={adminSong}
      availableTaxonomies={availableTaxonomies}
      backHref={backHref}
      canAccessScores={isAuthenticated}
      isAuthenticated={isAuthenticated}
      initialMode={mode === "edition" ? "edition" : "selection"}
      song={song}
    />
  );
}
