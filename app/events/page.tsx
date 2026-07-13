import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { EventIndex } from "@/src/modules/events/components/event-index";
import { listEvents } from "@/src/modules/events/services/event-management";
import { listEventTypes } from "@/src/modules/events/services/event-type-management";

export const dynamic = "force-dynamic";
function currentServerTime() {
  return Date.now();
}
export default async function EventsPage() {
  const actor = await getCurrentActor();
  const usableActor = actor?.mustChangePassword ? null : actor;
  const [initialEvents, eventTypes] = await Promise.all([listEvents("all", usableActor?.id ?? null), listEventTypes()]);
  return (
    <EventIndex
      canFilterMine={Boolean(usableActor)}
      canManage={usableActor?.permissions.includes("event.manage") ?? false}
      currentTime={currentServerTime()}
      eventTypes={eventTypes}
      initialEvents={initialEvents}
    />
  );
}
