import { describe, expect, it } from "vitest";

import { validatePushSubscription } from "./push-subscription";

describe("push subscription validation", () => {
  it("accepts a browser Web Push subscription", () => {
    expect(validatePushSubscription({
      endpoint: "https://push.example.test/subscription/123",
      expirationTime: null,
      keys: { p256dh: "public-key", auth: "auth-secret" },
    })).toEqual({
      endpoint: "https://push.example.test/subscription/123",
      expirationTime: null,
      keys: { p256dh: "public-key", auth: "auth-secret" },
    });
  });

  it("rejects non-HTTPS endpoints and incomplete keys", () => {
    expect(validatePushSubscription({
      endpoint: "http://push.example.test/123",
      keys: { p256dh: "public-key", auth: "auth-secret" },
    })).toBeNull();
    expect(validatePushSubscription({
      endpoint: "https://push.example.test/123",
      keys: { p256dh: "", auth: "auth-secret" },
    })).toBeNull();
  });
});
