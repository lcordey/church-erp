import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SongTaxonomyAdmin } from "@/src/modules/songs/components/song-taxonomy-admin";
import { listAdminSongTaxonomies } from "@/src/modules/songs/services/song-taxonomy-management";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomiesPage() {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login?redirectTo=/admin/referentiels");
  }

  const taxonomies = await listAdminSongTaxonomies();

  return (
    <main className="admin-page taxonomy-page">
      <div className="admin-shell">
        <AppTopBar
          backHref="/worship"
          backLabel="Retour au répertoire"
          mode="admin"
        />
        <div className="admin-hero">
          <h1>Thèmes et labels</h1>
          <p>
            Gère les listes disponibles pour classer et filtrer les chants.
          </p>
        </div>
        <SongTaxonomyAdmin initialTaxonomies={taxonomies} />
      </div>
    </main>
  );
}
