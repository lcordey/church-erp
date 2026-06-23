import { createHmac, timingSafeEqual } from "node:crypto";

export const authSessionCookieName = "churcherp_session";

const sessionDurationSeconds = 60 * 60 * 24 * 30;

type SessionPayload = {
  accessMode: "mvp-admin";
  expiresAt: number;
};

export type AuthenticatedActor = {
  accessMode: "mvp-admin";
};

function getLoginPassword() {
  return process.env.CHURCHERP_LOGIN_PASSWORD ?? "louange";
}

function getSessionSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ??
    process.env.CHURCHERP_LOGIN_PASSWORD ??
    "church-erp-local-development-session"
  );
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyLoginPassword(password: string) {
  return safeEqual(password, getLoginPassword());
}

export function createAuthSessionToken(now = Date.now()) {
  const payload: SessionPayload = {
    accessMode: "mvp-admin",
    expiresAt: now + sessionDurationSeconds * 1000,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readAuthSessionToken(token: string | undefined | null): AuthenticatedActor | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;

    if (
      payload.accessMode !== "mvp-admin" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return { accessMode: payload.accessMode };
  } catch {
    return null;
  }
}

export function readAuthSessionFromCookieHeader(cookieHeader: string | null) {
  const token = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${authSessionCookieName}=`))
    ?.slice(authSessionCookieName.length + 1);

  return readAuthSessionToken(token);
}

export function authSessionMaxAge() {
  return sessionDurationSeconds;
}
