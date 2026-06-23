import { redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SetlistIndex } from "@/src/modules/setlists/components/setlist-index";
import { listSetlists } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";

export default async function SetlistPage() {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login?redirectTo=/setlist");
  }

  const setlists = await listSetlists();

  return <SetlistIndex initialSetlists={setlists} />;
}
