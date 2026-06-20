import { notFound } from "next/navigation";

import { listPublicSongs } from "@/src/modules/songs/services/public-song-catalog";
import { SetlistEditor } from "@/src/modules/setlists/components/setlist-editor";
import { getSetlist } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

type SetlistEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SetlistEditPage({ params }: SetlistEditPageProps) {
  const { id } = await params;
  const [setlist, catalog] = await Promise.all([
    getSetlist(id),
    listPublicSongs(),
  ]);

  if (!setlist) {
    notFound();
  }

  return <SetlistEditor initialCatalog={catalog} initialSetlist={setlist} />;
}
