import { requirePermission } from "@/src/infrastructure/auth/require-admin";

import { createPushSubscriptionRepository, type PushSubscriptionRepository } from "../repositories/push-subscription-repository";
import type { PushNotificationPreferences, PushSubscriptionInput } from "../types/push";

export function getPushConfiguration() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() ?? "";
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
  const configured = Boolean(
    publicKey && privateKey && subject &&
    !publicKey.startsWith("replace-with-") &&
    !privateKey.startsWith("replace-with-"),
  );
  return { configured, publicKey: configured ? publicKey : "" };
}

export async function savePushSubscription(
  input: PushSubscriptionInput,
  repository: PushSubscriptionRepository = createPushSubscriptionRepository(),
) {
  const actor = await requirePermission("event.read");
  await repository.upsert(actor.id, input);
}

export async function removePushSubscription(
  endpoint: string,
  repository: PushSubscriptionRepository = createPushSubscriptionRepository(),
) {
  const actor = await requirePermission("event.read");
  await repository.deleteForUser(actor.id, endpoint);
}

export async function getPushSubscriptionPreferences(endpoint: string, repository: PushSubscriptionRepository = createPushSubscriptionRepository()) {
  const actor = await requirePermission("event.read");
  return repository.findForUser(actor.id, endpoint);
}

export async function updatePushSubscriptionPreferences(
  endpoint: string,
  preferences: PushNotificationPreferences,
  repository: PushSubscriptionRepository = createPushSubscriptionRepository(),
) {
  const actor = await requirePermission("event.read");
  return repository.updatePreferences(actor.id, endpoint, preferences);
}
