import {
  deleteSetlist,
  getSetlist,
  updateSetlist,
} from "@/src/modules/setlists/services/setlist-management";
import {
  invalidSetlistResponse,
  setlistErrorResponse,
  setlistNotFoundResponse,
} from "@/src/modules/setlists/http/setlist-response";
import { validateSetlistInput } from "@/src/modules/setlists/validation/setlist-input";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const setlist = await getSetlist(id);

  return setlist ? Response.json({ data: setlist }) : setlistNotFoundResponse();
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const input = validateSetlistInput(await request.json().catch(() => null));

  if (!input.success) {
    return invalidSetlistResponse(input.errors);
  }

  try {
    const setlist = await updateSetlist(id, input.data);
    return setlist ? Response.json({ data: setlist }) : setlistNotFoundResponse();
  } catch (error) {
    return setlistErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const deleted = await deleteSetlist(id);
    return deleted ? new Response(null, { status: 204 }) : setlistNotFoundResponse();
  } catch (error) {
    return setlistErrorResponse(error);
  }
}
