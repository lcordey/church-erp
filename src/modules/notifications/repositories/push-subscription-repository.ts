import { and, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import { pushSubscriptions } from "@/src/infrastructure/database/schema";

import type { PushNotificationPreferences, PushSubscriptionInput, StoredPushSubscription } from "../types/push";

export interface PushSubscriptionRepository {
  upsert(userId: string, input: PushSubscriptionInput): Promise<void>;
  deleteForUser(userId: string, endpoint: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  listForUsers(userIds: string[]): Promise<StoredPushSubscription[]>;
  findForUser(userId: string, endpoint: string): Promise<StoredPushSubscription | null>;
  updatePreferences(userId: string, endpoint: string, preferences: PushNotificationPreferences): Promise<StoredPushSubscription | null>;
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
        preferences: {
          "event-assignment": row.eventAssignmentEnabled,
          "event-setlist": row.eventSetlistEnabled,
        },
      }));
    },
    async findForUser(userId, endpoint) {
      const rows = await database.select().from(pushSubscriptions).where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      )).limit(1);
      const row = rows[0];
      return row ? {
        id: row.id, userId: row.userId, endpoint: row.endpoint,
        expirationTime: row.expirationTime?.getTime() ?? null,
        keys: { p256dh: row.p256dh, auth: row.auth },
        preferences: { "event-assignment": row.eventAssignmentEnabled, "event-setlist": row.eventSetlistEnabled },
      } : null;
    },
    async updatePreferences(userId, endpoint, preferences) {
      await database.update(pushSubscriptions).set({
        eventAssignmentEnabled: preferences["event-assignment"],
        eventSetlistEnabled: preferences["event-setlist"],
        updatedAt: new Date(),
      }).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
      return this.findForUser(userId, endpoint);
    },
  };
}
