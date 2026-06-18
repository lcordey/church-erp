import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SongPageWorkspace } from "@/src/modules/songs/components/song-page-workspace";
import { getAdminSong } from "@/src/modules/songs/services/admin-song-management";
import { getPublicSongBySlug } from "@/src/modules/songs/services/public-song-catalog";

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
  const song = await getPublicSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const adminSong = await getAdminSong(song.id);

  return (
    <SongPageWorkspace
      adminSong={adminSong}
      initialMode={mode === "edition" ? "edition" : "selection"}
      song={song}
    />
  );
}
