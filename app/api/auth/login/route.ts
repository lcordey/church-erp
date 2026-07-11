import { authSessionCookie } from "@/src/infrastructure/auth/session";
import {
  authenticateUser,
  InvalidCredentialsError,
} from "@/src/modules/identity/services/authentication";
import { validateLoginInput } from "@/src/modules/identity/validation/identity-input";
import { getSafeRedirectPath } from "@/src/shared/navigation/login-redirect";

export async function POST(request: Request) {
  const formData = await request.formData();
  const input = validateLoginInput(formData);
  const redirectTo = getSafeRedirectPath(
    String(formData.get("redirectTo") ?? "/worship"),
  );

  if (!input.success) {
    return new Response(null, {
      status: 303,
      headers: { location: `/login?error=1&redirectTo=${encodeURIComponent(redirectTo)}` },
    });
  }

  try {
    const { actor, token } = await authenticateUser(input.data);
    return new Response(null, {
      status: 303,
      headers: {
        location: actor.mustChangePassword
          ? `/password-change?redirectTo=${encodeURIComponent(redirectTo)}`
          : redirectTo,
        "set-cookie": authSessionCookie(token),
      },
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return new Response(null, {
        status: 303,
        headers: { location: `/login?error=1&redirectTo=${encodeURIComponent(redirectTo)}` },
      });
    }
    throw error;
  }
}
