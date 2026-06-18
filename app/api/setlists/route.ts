import {
  createSetlist,
  listSetlists,
} from "@/src/modules/setlists/services/setlist-management";
import {
  invalidSetlistResponse,
  setlistErrorResponse,
} from "@/src/modules/setlists/http/setlist-response";
import { validateSetlistInput } from "@/src/modules/setlists/validation/setlist-input";

export async function GET() {
  const setlists = await listSetlists();
  return Response.json({ data: setlists });
}

export async function POST(request: Request) {
  const input = validateSetlistInput(await request.json().catch(() => null));

  if (!input.success) {
    return invalidSetlistResponse(input.errors);
  }

  try {
    const setlist = await createSetlist(input.data);
    return Response.json({ data: setlist }, { status: 201 });
  } catch (error) {
    return setlistErrorResponse(error);
  }
}
