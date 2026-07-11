export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export type StoredPushSubscription = PushSubscriptionInput & {
  id: string;
  userId: string;
};

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
};
