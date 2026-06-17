import { AppTopBar } from "@/src/components/app-top-bar";
import { AdminSongForm } from "@/src/modules/songs/components/admin-song-form";

export default function NewAdminSongPage() {
  return (
    <main className="admin-page admin-page--editor">
      <div className="admin-editor-shell">
        <AppTopBar
          backHref="/"
          backLabel="Retour au répertoire"
          mode="admin"
        />
        <AdminSongForm />
      </div>
    </main>
  );
}
