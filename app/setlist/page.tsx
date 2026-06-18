import { SetlistIndex } from "@/src/modules/setlists/components/setlist-index";
import { listSetlists } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

export default async function SetlistPage() {
  const setlists = await listSetlists();

  return <SetlistIndex initialSetlists={setlists} />;
}
