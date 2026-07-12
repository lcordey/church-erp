import { notFound } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SetlistPlayer } from "@/src/modules/setlists/components/setlist-player";
import { getSetlist, getSetlistItemNotes } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

type SetlistPlayPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SetlistPlayPage({ params }: SetlistPlayPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();
  const canManage = Boolean(
    actor && !actor.mustChangePassword && actor.permissions.includes("setlist.manage"),
  );
  const [setlist, notes] = await Promise.all([
    getSetlist(id),
    canManage ? getSetlistItemNotes(id) : Promise.resolve([]),
  ]);

  if (!setlist) {
    notFound();
  }

  return (
    <SetlistPlayer
      canAccessScores={Boolean(
        actor && !actor.mustChangePassword && actor.permissions.includes("score.read"),
      )}
      canManage={canManage}
      initialNotes={notes}
      setlist={setlist}
    />
  );
}
