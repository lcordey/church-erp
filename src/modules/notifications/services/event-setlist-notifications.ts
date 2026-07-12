import type { EventDetail } from "@/src/modules/events/types/event";

import { sendPushToUsers } from "./push-delivery";

export async function notifyEventSetlistChange(event: EventDetail, previousSetlistTitle: string | null, userIds: string[]) {
  if (!userIds.length) return;
  const nextSetlistTitle = event.setlist?.title ?? null;
  const body = nextSetlistTitle
    ? previousSetlistTitle
      ? `La setlist de « ${event.title} » a été remplacée par « ${nextSetlistTitle} ».`
      : `Une setlist a été ajoutée à « ${event.title} » : « ${nextSetlistTitle} ».`
    : `La setlist de « ${event.title} » a été retirée.`;
  try {
    await sendPushToUsers(userIds, {
      title: "Setlist mise à jour",
      body,
      url: `/events/${event.id}`,
      tag: `event-setlist-${event.id}`,
    }, "event-setlist");
  } catch (error) {
    console.error("Unable to prepare event setlist notifications.", error);
  }
}
