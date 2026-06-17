"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";

import type { PublicSongSummary } from "../types/public-song";
import { SongCatalog } from "./song-catalog";

type SongsWorkspaceProps = {
  initialCollections?: string[];
  initialSearch?: string;
  initialSongs: PublicSongSummary[];
};

export function SongsWorkspace({
  initialCollections,
  initialSearch = "",
  initialSongs,
}: SongsWorkspaceProps) {
  const router = useRouter();

  function openSong(song: PublicSongSummary) {
    router.push(`/chants/${song.slug}`);
  }

  return (
    <main className="catalog-page">
      <div className="catalog-page__glow" aria-hidden="true" />
      <div className="catalog-shell">
        <AppTopBar
          actions={
            <Link
              className="admin-button admin-button--primary"
              href="/admin/chants/nouveau"
            >
              Nouveau chant
            </Link>
          }
          mode="public"
        />

        <section className="catalog-hero">
          <div>
            <p className="eyebrow">Équipe louange</p>
            <h1>Des chants prêts à être partagés.</h1>
          </div>
          <p className="catalog-hero__intro">
            Retrouvez les paroles, accords et informations utiles des chants
            publiés par l’équipe.
          </p>
        </section>

        <div className="catalog-workspace">
          <section className="catalog-section" aria-labelledby="catalog-title">
            <SongCatalog
              initialCollections={initialCollections}
              initialSearch={initialSearch}
              onOpenSong={openSong}
              songs={initialSongs}
            />
          </section>
        </div>

        <footer className="site-footer">
          <span>Lecture publique</span>
          <span>Mis à jour par l’équipe louange</span>
        </footer>
      </div>
    </main>
  );
}
