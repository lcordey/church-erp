import { createHash, randomBytes } from "node:crypto";

export const authSessionCookieName = "churcherp_session";
const sessionDurationSeconds = 60 * 60 * 24 * 30;

export function createAuthSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAuthSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function readAuthSessionTokenFromCookieHeader(cookieHeader: string | null) {
  return (
    cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${authSessionCookieName}=`))
      ?.slice(authSessionCookieName.length + 1) ?? null
  );
}

export function authSessionExpiresAt(now = Date.now()) {
  return new Date(now + sessionDurationSeconds * 1000);
}

export function authSessionMaxAge() {
  return sessionDurationSeconds;
}

export function authSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${authSessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDurationSeconds}${secure}`;
}

export function clearAuthSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${authSessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
