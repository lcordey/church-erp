import { identityErrorResponse, invalidIdentityResponse } from "@/src/modules/identity/http/identity-response";
import { resetManagedUserPassword } from "@/src/modules/identity/services/user-management";
import { validateTemporaryPasswordInput } from "@/src/modules/identity/validation/identity-input";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const input = validateTemporaryPasswordInput(await request.json().catch(() => null));
  if (!input.success) return invalidIdentityResponse(input.errors);
  try {
    await resetManagedUserPassword((await params).id, input.data.temporaryPassword);
    return new Response(null, { status: 204 });
  } catch (error) { return identityErrorResponse(error); }
}
