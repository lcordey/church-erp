import { and, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import { pushSubscriptions } from "@/src/infrastructure/database/schema";

import type { PushSubscriptionInput, StoredPushSubscription } from "../types/push";

export interface PushSubscriptionRepository {
  upsert(userId: string, input: PushSubscriptionInput): Promise<void>;
  deleteForUser(userId: string, endpoint: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  listForUsers(userIds: string[]): Promise<StoredPushSubscription[]>;
}

export function createPushSubscriptionRepository(): PushSubscriptionRepository {
  const database = getDatabase();
  return {
    async upsert(userId, input) {
      await database.insert(pushSubscriptions).values({
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
      }).onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
          updatedAt: new Date(),
        },
      });
    },
    async deleteForUser(userId, endpoint) {
      await database.delete(pushSubscriptions).where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ));
    },
    async deleteById(id) {
      await database.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
    },
    async listForUsers(userIds) {
      if (!userIds.length) return [];
      const rows = await database.select().from(pushSubscriptions)
        .where(inArray(pushSubscriptions.userId, userIds));
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        endpoint: row.endpoint,
        expirationTime: row.expirationTime?.getTime() ?? null,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }));
    },
  };
}
