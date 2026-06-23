import { notFound, redirect } from "next/navigation";

import { AppTopBar } from "@/src/components/app-top-bar";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { AdminSongForm } from "@/src/modules/songs/components/admin-song-form";
import { getAdminSong } from "@/src/modules/songs/services/admin-song-management";

export const dynamic = "force-dynamic";

type AdminSongPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSongPage({ params }: AdminSongPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();

  if (!actor) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/admin/chants/${id}`)}`);
  }

  const song = await getAdminSong(id);

  if (!song) {
    notFound();
  }

  return (
    <main className="admin-page admin-page--editor">
      <div className="admin-editor-shell">
        <AppTopBar
          backHref="/worship"
          backLabel="Retour au répertoire"
          mode="admin"
        />
        <AdminSongForm song={song} />
      </div>
    </main>
  );
}
