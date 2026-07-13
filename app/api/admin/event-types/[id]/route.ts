import { eventTypeErrorResponse } from "@/src/modules/events/http/event-type-response";
import { deleteEventType } from "@/src/modules/events/services/event-type-management";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deleted = await deleteEventType((await params).id);
    return deleted ? new Response(null, { status: 204 }) : Response.json({ error: { code: "EVENT_TYPE_NOT_FOUND", message: "Type d’événement introuvable." } }, { status: 404 });
  } catch (error) { return eventTypeErrorResponse(error); }
}
