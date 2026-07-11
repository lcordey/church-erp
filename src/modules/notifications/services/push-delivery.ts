import webPush from "web-push";

import { createPushSubscriptionRepository, type PushSubscriptionRepository } from "../repositories/push-subscription-repository";
import type { PushMessage } from "../types/push";

function vapidDetails() {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  return subject && publicKey && privateKey ? { subject, publicKey, privateKey } : null;
}

export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage,
  repository: PushSubscriptionRepository = createPushSubscriptionRepository(),
) {
  const details = vapidDetails();
  if (!details || !userIds.length) return;
  const subscriptions = await repository.listForUsers([...new Set(userIds)]);
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(message), {
        TTL: 86_400,
        urgency: "normal",
        vapidDetails: details,
      });
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode) : null;
      if (statusCode === 404 || statusCode === 410) {
        await repository.deleteById(subscription.id);
        return;
      }
      console.error("Unable to deliver a Web Push notification.", error);
    }
  }));
}
