import { eventErrorResponse, eventNotFoundResponse, invalidEventResponse } from "@/src/modules/events/http/event-response";
import { deleteEvent, getEvent, updateEvent } from "@/src/modules/events/services/event-management";
import { validateEventInput } from "@/src/modules/events/validation/event-input";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try { const event = await getEvent((await params).id); return event ? Response.json({ data: event }) : eventNotFoundResponse(); }
  catch (error) { return eventErrorResponse(error); }
}
export async function PUT(request: Request, { params }: RouteContext) {
  const input = validateEventInput(await request.json().catch(() => null));
  if (!input.success) return invalidEventResponse(input.errors);
  try { const event = await updateEvent((await params).id, input.data); return event ? Response.json({ data: event }) : eventNotFoundResponse(); }
  catch (error) { return eventErrorResponse(error); }
}
export async function DELETE(_request: Request, { params }: RouteContext) {
  try { return await deleteEvent((await params).id) ? new Response(null, { status: 204 }) : eventNotFoundResponse(); }
  catch (error) { return eventErrorResponse(error); }
}
