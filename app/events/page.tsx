import { redirect } from "next/navigation";

import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventIndex } from "@/src/modules/events/components/event-index";
import { listEvents } from "@/src/modules/events/services/event-management";
import { getLoginHref } from "@/src/shared/navigation/login-redirect";

export const dynamic = "force-dynamic";
function currentServerTime() {
  return Date.now();
}
export default async function EventsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect(getLoginHref("/events"));
  if (actor.mustChangePassword) redirect("/password-change?redirectTo=/events");
  if (!actor.permissions.includes("event.read")) redirect("/profile");
  return <EventIndex canManage={actor.permissions.includes("event.manage")} currentTime={currentServerTime()} initialEvents={await listEvents("all")} />;
}
