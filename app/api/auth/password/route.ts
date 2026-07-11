import { getActorFromRequest } from "@/src/infrastructure/auth/require-admin";
import { authSessionCookie } from "@/src/infrastructure/auth/session";
import {
  changePassword,
  CurrentPasswordInvalidError,
} from "@/src/modules/identity/services/authentication";
import { validateChangePasswordInput } from "@/src/modules/identity/validation/identity-input";
import { getSafeRedirectPath } from "@/src/shared/navigation/login-redirect";

export async function POST(request: Request) {
  const actor = await getActorFromRequest(request);
  if (!actor) return Response.redirect(new URL("/login", request.url), 303);
  const formData = await request.formData();
  const redirectTo = getSafeRedirectPath(String(formData.get("redirectTo") ?? "/profile"));
  const input = validateChangePasswordInput({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!input.success) {
    const error = input.errors.confirmNewPassword ? "confirmation" : "validation";
    return Response.redirect(
      new URL(`/password-change?error=${error}&redirectTo=${encodeURIComponent(redirectTo)}`, request.url),
      303,
    );
  }
  try {
    const token = await changePassword(actor, input.data);
    return new Response(null, {
      status: 303,
      headers: { location: redirectTo, "set-cookie": authSessionCookie(token) },
    });
  } catch (error) {
    if (error instanceof CurrentPasswordInvalidError) {
      return Response.redirect(
        new URL(`/password-change?error=current&redirectTo=${encodeURIComponent(redirectTo)}`, request.url),
        303,
      );
    }
    throw error;
  }
}
