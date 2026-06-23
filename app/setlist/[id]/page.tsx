import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { listPublicSongs } from "@/src/modules/songs/services/public-song-catalog";
import { SetlistEditor } from "@/src/modules/setlists/components/setlist-editor";
import { getSetlist } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

type SetlistEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SetlistEditPage({ params }: SetlistEditPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();

  if (!actor) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/setlist/${id}`)}`);
  }

  const [setlist, catalog] = await Promise.all([
    getSetlist(id),
    listPublicSongs(),
  ]);

  if (!setlist) {
    notFound();
  }

  return <SetlistEditor initialCatalog={catalog} initialSetlist={setlist} />;
}
