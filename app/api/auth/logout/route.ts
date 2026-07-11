import {
  clearAuthSessionCookie,
  readAuthSessionTokenFromCookieHeader,
} from "@/src/infrastructure/auth/session";
import { revokeSession } from "@/src/modules/identity/services/authentication";

export async function POST(request: Request) {
  await revokeSession(readAuthSessionTokenFromCookieHeader(request.headers.get("cookie")));
  return new Response(null, {
    status: 303,
    headers: { location: "/worship", "set-cookie": clearAuthSessionCookie() },
  });
}
