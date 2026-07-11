import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventEditor } from "@/src/modules/events/components/event-editor";
import { getEvent } from "@/src/modules/events/services/event-management";
import { listAssignableUsers } from "@/src/modules/identity/services/user-management";
import { listSetlists } from "@/src/modules/setlists/services/setlist-management";

export const dynamic = "force-dynamic";
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  const id = (await params).id;
  if (!actor) redirect(`/login?redirectTo=${encodeURIComponent(`/events/${id}`)}`);
  if (actor.mustChangePassword) redirect(`/password-change?redirectTo=${encodeURIComponent(`/events/${id}`)}`);
  if (!actor.permissions.includes("event.read")) redirect("/profile");
  const event = await getEvent(id);
  if (!event) notFound();
  const canManage = actor.permissions.includes("event.manage");
  const [setlists, users] = canManage ? await Promise.all([listSetlists(), listAssignableUsers()]) : [[], []];
  return <EventEditor canManage={canManage} event={event} setlists={setlists} users={users} />;
}
