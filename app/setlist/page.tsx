import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SetlistIndex } from "@/src/modules/setlists/components/setlist-index";
import { listSetlists } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

export default async function SetlistPage() {
  const actor = await getCurrentActor();
  const setlists = await listSetlists();

  return (
    <SetlistIndex
      initialSetlists={setlists}
      isAuthenticated={actor !== null}
    />
  );
}
