import {
  updateSetlistItemTeamNote,
} from "@/src/modules/setlists/services/setlist-management";
import {
  invalidSetlistNoteResponse,
  setlistErrorResponse,
} from "@/src/modules/setlists/http/setlist-response";
import { validateSetlistNoteInput } from "@/src/modules/setlists/validation/setlist-note-input";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const input = validateSetlistNoteInput(await request.json().catch(() => null));
  if (!input.success) return invalidSetlistNoteResponse(input.message);

  const { id, itemId } = await params;

  try {
    const note = await updateSetlistItemTeamNote(id, itemId, input.data.content);
    return Response.json({ data: note });
  } catch (error) {
    return setlistErrorResponse(error);
  }
}
