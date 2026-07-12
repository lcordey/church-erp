import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { SetlistEditor } from "@/src/modules/setlists/components/setlist-editor";
import { SetlistPlayer } from "@/src/modules/setlists/components/setlist-player";
import { getSetlist } from "@/src/modules/setlists/services/setlist-management";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

export const dynamic = "force-dynamic";

type SetlistEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function SetlistEditPage({ params, searchParams }: SetlistEditPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const actor = await getCurrentActor();
  const isEditing = mode === "edition";
  const canManage = Boolean(
    actor && !actor.mustChangePassword && actor.permissions.includes("setlist.manage"),
  );
  const canAccessScores = Boolean(
    actor && !actor.mustChangePassword && actor.permissions.includes("score.read"),
  );

  if (isEditing && !actor) {
    redirect(getLoginHref(`/setlist/${id}?mode=edition`));
  }
  if (isEditing && actor?.mustChangePassword) redirect(`/password-change?redirectTo=${encodeURIComponent(`/setlist/${id}?mode=edition`)}`);
  if (isEditing && !canManage) redirect(`/setlist/${id}`);

  const setlist = await getSetlist(id);

  if (!setlist) {
    notFound();
  }

  if (isEditing) {
    return <SetlistEditor initialSetlist={setlist} />;
  }

  return (
    <SetlistPlayer
      canAccessScores={canAccessScores}
      canManage={canManage}
      setlist={setlist}
    />
  );
}
