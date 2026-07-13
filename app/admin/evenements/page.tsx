import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventTypeAdmin } from "@/src/modules/events/components/event-type-admin";
import { listAdminEventTypes } from "@/src/modules/events/services/event-type-management";

export const dynamic = "force-dynamic";

export default async function AdminEventTypesPage() {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login?redirectTo=/admin/evenements");
  }
  if (actor.mustChangePassword) redirect("/password-change?redirectTo=/admin/evenements");
  if (!actor.permissions.includes("taxonomy.manage")) redirect("/worship");

  const eventTypes = await listAdminEventTypes();


  return (
    <main className="admin-page taxonomy-page">
      <div className="admin-shell">
        <AppTopBar
          backHref="/admin"
          backLabel="Retour à l’administration"
          mode="admin"
        />
        <div className="admin-hero">
          <h1>Événements</h1>
          <p>
            Gère les types disponibles pour classer et filtrer les événements.
          </p>
        </div>
        <div className="taxonomy-admin__grid"><EventTypeAdmin initialEventTypes={eventTypes} /></div>
      </div>
    </main>
  );
}
