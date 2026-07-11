import { identityErrorResponse, invalidIdentityResponse } from "@/src/modules/identity/http/identity-response";
import { updateManagedUser } from "@/src/modules/identity/services/user-management";
import { validateUpdateUserInput } from "@/src/modules/identity/validation/identity-input";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const input = validateUpdateUserInput(await request.json().catch(() => null));
  if (!input.success) return invalidIdentityResponse(input.errors);
  try {
    return Response.json({ data: await updateManagedUser((await params).id, input.data) });
  } catch (error) { return identityErrorResponse(error); }
}
