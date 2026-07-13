import { eventTypeErrorResponse } from "@/src/modules/events/http/event-type-response";
import { createEventType, listAdminEventTypes } from "@/src/modules/events/services/event-type-management";

export async function GET() { try { return Response.json({ data: await listAdminEventTypes() }); } catch (error) { return eventTypeErrorResponse(error); } }
export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as { name?: unknown } | null;
  try { return Response.json({ data: await createEventType(input?.name) }, { status: 201 }); } catch (error) { return eventTypeErrorResponse(error); }
}
