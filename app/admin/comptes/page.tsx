import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { UserAdmin } from "@/src/modules/identity/components/user-admin";
import { listManagedUsers } from "@/src/modules/identity/services/user-management";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login?redirectTo=/admin/comptes");
  if (actor.mustChangePassword) redirect("/password-change?redirectTo=/admin/comptes");
  if (!actor.permissions.includes("user.manage")) redirect("/worship");
  const users = await listManagedUsers();
  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AppTopBar backHref="/admin" backLabel="Retour à l’administration" mode="admin" />
        <div className="admin-hero admin-hero--compact"><div><p className="eyebrow">Administration</p><h1>Comptes</h1></div><p>Crée les accès et attribue les groupes Louange et Admin.</p></div>
        <UserAdmin actorId={actor.id} initialUsers={users} />
      </div>
    </main>
  );
}
