import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventTypeAdmin } from "@/src/modules/events/components/event-type-admin";
import { listAdminEventTypes } from "@/src/modules/events/services/event-type-management";
import { SongTaxonomyAdmin } from "@/src/modules/songs/components/song-taxonomy-admin";
import { listAdminSongTaxonomies } from "@/src/modules/songs/services/song-taxonomy-management";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomiesPage() {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login?redirectTo=/admin/referentiels");
  }
  if (actor.mustChangePassword) redirect("/password-change?redirectTo=/admin/referentiels");
  if (!actor.permissions.includes("taxonomy.manage")) redirect("/worship");

  const [taxonomies, eventTypes] = await Promise.all([listAdminSongTaxonomies(), listAdminEventTypes()]);

  return (
    <main className="admin-page taxonomy-page">
      <div className="admin-shell">
        <AppTopBar
          backHref="/admin"
          backLabel="Retour à l’administration"
          mode="admin"
        />
        <div className="admin-hero">
          <h1>Référentiels</h1>
          <p>
            Gère les listes disponibles pour classer et filtrer les chants et les événements.
          </p>
        </div>
        <SongTaxonomyAdmin initialTaxonomies={taxonomies} />
        <div className="taxonomy-admin__grid"><EventTypeAdmin initialEventTypes={eventTypes} /></div>
      </div>
    </main>
  );
}
