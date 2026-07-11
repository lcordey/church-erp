import { identityErrorResponse, invalidIdentityResponse } from "@/src/modules/identity/http/identity-response";
import { createManagedUser, listManagedUsers } from "@/src/modules/identity/services/user-management";
import { validateCreateUserInput } from "@/src/modules/identity/validation/identity-input";

export async function GET() {
  try { return Response.json({ data: await listManagedUsers() }); }
  catch (error) { return identityErrorResponse(error); }
}

export async function POST(request: Request) {
  const input = validateCreateUserInput(await request.json().catch(() => null));
  if (!input.success) return invalidIdentityResponse(input.errors);
  try { return Response.json({ data: await createManagedUser(input.data) }, { status: 201 }); }
  catch (error) { return identityErrorResponse(error); }
}
