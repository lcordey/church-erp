import type { PushSubscriptionInput } from "../types/push";

export function validatePushSubscription(value: unknown): PushSubscriptionInput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const keys = candidate.keys;
  if (!keys || typeof keys !== "object") return null;
  const keyValues = keys as Record<string, unknown>;
  if (
    typeof candidate.endpoint !== "string" ||
    candidate.endpoint.length > 4_096 ||
    typeof keyValues.p256dh !== "string" ||
    keyValues.p256dh.length > 512 ||
    typeof keyValues.auth !== "string" ||
    keyValues.auth.length > 512
  ) return null;
  try {
    if (new URL(candidate.endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  if (!candidate.endpoint || !keyValues.p256dh || !keyValues.auth) return null;
  const expirationTime = candidate.expirationTime;
  if (expirationTime !== null && expirationTime !== undefined &&
      (typeof expirationTime !== "number" || !Number.isFinite(expirationTime))) return null;
  return {
    endpoint: candidate.endpoint,
    expirationTime: typeof expirationTime === "number" ? expirationTime : null,
    keys: { p256dh: keyValues.p256dh, auth: keyValues.auth },
  };
}
