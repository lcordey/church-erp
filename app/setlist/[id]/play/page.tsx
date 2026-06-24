import { notFound } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SetlistPlayer } from "@/src/modules/setlists/components/setlist-player";
import { getSetlist } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

type SetlistPlayPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SetlistPlayPage({ params }: SetlistPlayPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();
  const setlist = await getSetlist(id);

  if (!setlist) {
    notFound();
  }

  return (
    <SetlistPlayer
      canAccessScores={actor !== null}
      setlist={setlist}
    />
  );
}
