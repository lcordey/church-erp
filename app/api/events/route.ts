import { getActorFromRequest } from "@/src/infrastructure/auth/require-admin";
import { eventErrorResponse, invalidEventResponse } from "@/src/modules/events/http/event-response";
import { createEvent, listEvents } from "@/src/modules/events/services/event-management";
import type { EventScope } from "@/src/modules/events/types/event";
import { validateEventInput } from "@/src/modules/events/validation/event-input";

export async function GET(request: Request) {
  const scope: EventScope = new URL(request.url).searchParams.get("scope") === "mine" ? "mine" : "all";
  try {
    const actor = await getActorFromRequest(request);
    const usableActor = actor?.mustChangePassword ? null : actor;
    return Response.json({ data: await listEvents(scope, usableActor?.id ?? null) });
  }
  catch (error) { return eventErrorResponse(error); }
}

export async function POST(request: Request) {
  const input = validateEventInput(await request.json().catch(() => null));
  if (!input.success) return invalidEventResponse(input.errors);
  try { return Response.json({ data: await createEvent(input.data) }, { status: 201 }); }
  catch (error) { return eventErrorResponse(error); }
}
