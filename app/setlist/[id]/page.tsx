import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SetlistEditor } from "@/src/modules/setlists/components/setlist-editor";
import { getSetlist } from "@/src/modules/setlists/services/setlist-management";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

export const dynamic = "force-dynamic";

type SetlistEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SetlistEditPage({ params }: SetlistEditPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();

  if (!actor) {
    redirect(getLoginHref(`/setlist/${id}`));
  }

  const setlist = await getSetlist(id);

  if (!setlist) {
    notFound();
  }

  return <SetlistEditor initialSetlist={setlist} />;
}
