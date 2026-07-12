export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export type StoredPushSubscription = PushSubscriptionInput & {
  id: string;
  userId: string;
  preferences: PushNotificationPreferences;
};

export type PushNotificationType = "event-assignment" | "event-setlist";

export type PushNotificationPreferences = Record<PushNotificationType, boolean>;

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
};
