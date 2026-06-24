import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SongPageWorkspace } from "@/src/modules/songs/components/song-page-workspace";
import { getAdminSong } from "@/src/modules/songs/services/admin-song-management";
import { getPublicSongBySlug } from "@/src/modules/songs/services/public-song-catalog";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chant · ChurchERP",
  description: "Paroles et accords d'un chant publié.",
};

type SongPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function SongPage({ params, searchParams }: SongPageProps) {
  const { slug } = await params;
  const { mode } = await searchParams;
  const actor = await getCurrentActor();
  const isAuthenticated = actor !== null;

  if (mode === "edition" && !isAuthenticated) {
    redirect(getLoginHref(`/chants/${slug}?mode=edition`));
  }

  const song = await getPublicSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const adminSong = isAuthenticated ? await getAdminSong(song.id) : null;

  return (
    <SongPageWorkspace
      adminSong={adminSong}
      canAccessScores={isAuthenticated}
      isAuthenticated={isAuthenticated}
      initialMode={mode === "edition" ? "edition" : "selection"}
      song={song}
    />
  );
}
