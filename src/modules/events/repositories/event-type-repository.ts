import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import { eventTypes } from "@/src/infrastructure/database/schema";

import type { EventType } from "../types/event";

export class EventTypeNameConflictError extends Error {}

export interface EventTypeRepository {
  list(): Promise<EventType[]>;
  create(name: string): Promise<EventType>;
  delete(id: string): Promise<boolean>;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export function createEventTypeRepository(): EventTypeRepository {
  const database = getDatabase();
  return {
    async list() { return database.select({ id: eventTypes.id, name: eventTypes.name }).from(eventTypes).orderBy(asc(eventTypes.name)); },
    async create(name) {
      try {
        const [created] = await database.insert(eventTypes).values({ name }).returning({ id: eventTypes.id, name: eventTypes.name });
        return created;
      } catch (error) {
        if (isUniqueViolation(error)) throw new EventTypeNameConflictError();
        throw error;
      }
    },
    async delete(id) {
      const deleted = await database.delete(eventTypes).where(eq(eventTypes.id, id)).returning({ id: eventTypes.id });
      return deleted.length > 0;
    },
  };
}
