import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { AdminSongForm } from "@/src/modules/songs/components/admin-song-form";
import { listAdminSongTaxonomies } from "@/src/modules/songs/services/song-taxonomy-management";

export default async function NewAdminSongPage() {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login?redirectTo=/admin/chants/nouveau");
  }

  const taxonomies = await listAdminSongTaxonomies();

  return (
    <main className="admin-page admin-page--editor">
      <div className="admin-editor-shell">
        <AppTopBar
          backHref="/worship"
          backLabel="Retour au répertoire"
          mode="admin"
        />
        <AdminSongForm availableTaxonomies={taxonomies} />
      </div>
    </main>
  );
}
