import { notFound } from "next/navigation";

import { SetlistPlayer } from "@/src/modules/setlists/components/setlist-player";
import { getSetlist } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

type SetlistPlayPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SetlistPlayPage({ params }: SetlistPlayPageProps) {
  const { id } = await params;
  const setlist = await getSetlist(id);

  if (!setlist) {
    notFound();
  }

  return <SetlistPlayer setlist={setlist} />;
}
