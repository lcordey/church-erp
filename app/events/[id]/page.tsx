import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventEditor } from "@/src/modules/events/components/event-editor";
import { getEvent } from "@/src/modules/events/services/event-management";
import { listAssignableUsers } from "@/src/modules/identity/services/user-management";
import { listSetlists } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";
export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const actor = await getCurrentActor();
  const id = (await params).id;
  const mode = (await searchParams).mode;
  const usableActor = actor?.mustChangePassword ? null : actor;
  const event = await getEvent(id, usableActor?.id ?? null);
  if (!event) notFound();
  const canManage = usableActor?.permissions.includes("event.manage") ?? false;
  const isEditing = mode === "edition";
  if (isEditing && !actor) redirect(`/login?redirectTo=${encodeURIComponent(`/events/${id}?mode=edition`)}`);
  if (isEditing && actor?.mustChangePassword) redirect(`/password-change?redirectTo=${encodeURIComponent(`/events/${id}?mode=edition`)}`);
  if (isEditing && !canManage) redirect(`/events/${id}`);
  const [setlists, users] = canManage ? await Promise.all([listSetlists(), listAssignableUsers()]) : [[], []];
  return (
    <EventEditor
      canManage={canManage}
      canOpenSetlist={usableActor?.permissions.includes("setlist.manage") ?? false}
      event={event}
      isEditing={isEditing}
      setlists={setlists}
      users={users}
    />
  );
}
