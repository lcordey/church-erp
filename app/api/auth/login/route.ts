import {
  authSessionCookieName,
  authSessionMaxAge,
  createAuthSessionToken,
  verifyLoginPassword,
} from "@/src/infrastructure/auth/session";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/worship");

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
      location: redirectTo.startsWith("/") ? redirectTo : "/worship",
      "set-cookie": `${authSessionCookieName}=${createAuthSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${authSessionMaxAge()}`,
    },
  });
}
