import {
  authSessionCookieName,
  authSessionMaxAge,
  createAuthSessionToken,
  verifyLoginPassword,
} from "@/src/infrastructure/auth/session";
import { getSafeRedirectPath } from "@/src/shared/navigation/login-redirect";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeRedirectPath(
    String(formData.get("redirectTo") ?? "/worship"),
  );

  if (!verifyLoginPassword(password)) {
    return new Response(null, {
      status: 303,
      headers: {
        location: `/login?error=1&redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      location: redirectTo,
      "set-cookie": `${authSessionCookieName}=${createAuthSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${authSessionMaxAge()}`,
    },
  });
}
