import { redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { AdminSongForm } from "@/src/modules/songs/components/admin-song-form";

export default async function NewAdminSongPage() {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login?redirectTo=/admin/chants/nouveau");
  }

  return (
    <main className="admin-page admin-page--editor">
      <div className="admin-editor-shell">
        <AppTopBar
          backHref="/worship"
          backLabel="Retour au répertoire"
          mode="admin"
        />
        <AdminSongForm />
      </div>
    </main>
  );
}
