import { redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SongEditorShell } from "@/src/modules/songs/components/song-editor-shell";
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
        <SongEditorShell
          availableTaxonomies={taxonomies}
          backHref="/worship"
          backLabel="Retour au répertoire"
          mode="admin"
          showViewModeToggle={false}
        />
      </div>
    </main>
  );
}
