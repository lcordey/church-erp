import type { EventDetail } from "@/src/modules/events/types/event";

import { sendPushToUsers } from "./push-delivery";

const eventDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export async function notifyNewEventAssignments(event: EventDetail, userIds: string[]) {
  if (!userIds.length) return;
  const roles = new Map(event.assignments.map((assignment) => [assignment.userId, assignment.role]));
  try {
    await Promise.all(userIds.map((userId) => {
      const role = roles.get(userId);
      const roleText = role ? ` Rôle : ${role}.` : "";
      return sendPushToUsers([userId], {
        title: "Nouveau service",
        body: `Tu es de service pour « ${event.title} » le ${eventDateFormatter.format(event.startsAt)}.${roleText}`,
        url: `/events/${event.id}`,
        tag: `event-assignment-${event.id}`,
      }, "event-assignment");
    }));
  } catch (error) {
    // The event has already been saved: notification transport must not roll it back.
    console.error("Unable to prepare event assignment notifications.", error);
  }
}
