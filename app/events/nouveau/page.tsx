import { redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventEditor } from "@/src/modules/events/components/event-editor";
import { listAssignableUsers } from "@/src/modules/identity/services/user-management";
import { listSetlists } from "@/src/modules/setlists/services/setlist-management";
import { listEventTypes } from "@/src/modules/events/services/event-type-management";

export default async function NewEventPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login?redirectTo=/events/nouveau");
  if (actor.mustChangePassword) redirect("/password-change?redirectTo=/events/nouveau");
  if (!actor.permissions.includes("event.manage")) redirect("/events");
  const [setlists, users, eventTypes] = await Promise.all([listSetlists(), listAssignableUsers(), listEventTypes()]);
  return <EventEditor canManage currentUserId={actor.id} eventTypes={eventTypes} setlists={setlists} users={users} />;
}
