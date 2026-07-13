import { and, asc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import { eventAssignments, eventTypes, events, setlists, users } from "@/src/infrastructure/database/schema";

import type { EventDetail, EventInput, EventScope, EventSummary } from "../types/event";

export interface EventRepository {
  list(actorId: string | null, scope: EventScope): Promise<EventSummary[]>;
  findById(id: string, actorId: string | null): Promise<EventDetail | null>;
  create(input: EventInput, actorId: string): Promise<EventDetail>;
  update(id: string, input: EventInput, actorId: string): Promise<EventDetail | null>;
  delete(id: string): Promise<boolean>;
  setlistExists(id: string): Promise<boolean>;
  eventTypeExists(id: string): Promise<boolean>;
  listActiveUserIds(ids: string[]): Promise<Set<string>>;
}

export function createEventRepository(): EventRepository {
  const database = getDatabase();

  async function loadAssignments(eventIds: string[]) {
    if (!eventIds.length) return [];
    return database
      .select({
        id: eventAssignments.id,
        eventId: eventAssignments.eventId,
        userId: users.id,
        displayName: users.displayName,
        username: users.username,
        userStatus: users.status,
        role: eventAssignments.role,
      })
      .from(eventAssignments)
      .innerJoin(users, eq(eventAssignments.userId, users.id))
      .where(inArray(eventAssignments.eventId, eventIds))
      .orderBy(asc(users.displayName));
  }

  async function list(actorId: string | null, scope: EventScope) {
    const rows = await database
      .select({ event: events, setlistId: setlists.id, setlistTitle: setlists.title, eventTypeId: eventTypes.id, eventTypeName: eventTypes.name })
      .from(events)
      .leftJoin(setlists, eq(events.setlistId, setlists.id))
      .leftJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
      .orderBy(asc(events.startsAt));
    const assignments = await loadAssignments(rows.map((row) => row.event.id));
    return rows
      .map((row): EventSummary => {
        const assigned = assignments.filter((item) => item.eventId === row.event.id);
        return {
          id: row.event.id,
          title: row.event.title,
          startsAt: row.event.startsAt,
          endsAt: row.event.endsAt,
          eventType: row.eventTypeId && row.eventTypeName ? { id: row.eventTypeId, name: row.eventTypeName } : null,
          setlist: row.setlistId && row.setlistTitle ? { id: row.setlistId, title: row.setlistTitle } : null,
          assignmentCount: assigned.length,
          isCurrentUserAssigned: actorId ? assigned.some((item) => item.userId === actorId) : false,
        };
      })
      .filter((event) => scope === "all" || event.isCurrentUserAssigned);
  }

  async function findById(id: string, actorId: string | null): Promise<EventDetail | null> {
    const rows = await database
      .select({ event: events, setlistId: setlists.id, setlistTitle: setlists.title, eventTypeId: eventTypes.id, eventTypeName: eventTypes.name })
      .from(events)
      .leftJoin(setlists, eq(events.setlistId, setlists.id))
      .leftJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
      .where(eq(events.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const assignments = await loadAssignments([id]);
    return {
      id: row.event.id,
      title: row.event.title,
      startsAt: row.event.startsAt,
      endsAt: row.event.endsAt,
      eventType: row.eventTypeId && row.eventTypeName ? { id: row.eventTypeId, name: row.eventTypeName } : null,
      notes: row.event.notes,
      setlist: row.setlistId && row.setlistTitle ? { id: row.setlistId, title: row.setlistTitle } : null,
      assignmentCount: assignments.length,
      isCurrentUserAssigned: actorId ? assignments.some((item) => item.userId === actorId) : false,
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.userId,
        displayName: assignment.displayName,
        username: assignment.username,
        userStatus: assignment.userStatus,
        role: assignment.role,
      })),
      createdAt: row.event.createdAt,
      updatedAt: row.event.updatedAt,
    };
  }

  async function replaceAssignments(transaction: Parameters<Parameters<typeof database.transaction>[0]>[0], eventId: string, input: EventInput) {
    await transaction.delete(eventAssignments).where(eq(eventAssignments.eventId, eventId));
    if (input.assignments.length) {
      await transaction.insert(eventAssignments).values(
        input.assignments.map((assignment) => ({ eventId, userId: assignment.userId, role: assignment.role })),
      );
    }
  }

  return {
    list,
    findById,
    async create(input, actorId) {
      const id = await database.transaction(async (transaction) => {
        const [created] = await transaction.insert(events).values({
          title: input.title, startsAt: input.startsAt, endsAt: input.endsAt,
          notes: input.notes, setlistId: input.setlistId, eventTypeId: input.eventTypeId,
        }).returning({ id: events.id });
        await replaceAssignments(transaction, created.id, input);
        return created.id;
      });
      const created = await findById(id, actorId);
      if (!created) throw new Error("Created event could not be reloaded.");
      return created;
    },
    async update(id, input, actorId) {
      const exists = await database.transaction(async (transaction) => {
        const [updated] = await transaction.update(events).set({
          title: input.title, startsAt: input.startsAt, endsAt: input.endsAt,
          notes: input.notes, setlistId: input.setlistId, eventTypeId: input.eventTypeId, updatedAt: new Date(),
        }).where(eq(events.id, id)).returning({ id: events.id });
        if (!updated) return false;
        await replaceAssignments(transaction, id, input);
        return true;
      });
      return exists ? findById(id, actorId) : null;
    },
    async delete(id) {
      const rows = await database.delete(events).where(eq(events.id, id)).returning({ id: events.id });
      return rows.length > 0;
    },
    async setlistExists(id) {
      return (await database.select({ id: setlists.id }).from(setlists).where(eq(setlists.id, id)).limit(1)).length > 0;
    },
    async eventTypeExists(id) {
      return (await database.select({ id: eventTypes.id }).from(eventTypes).where(eq(eventTypes.id, id)).limit(1)).length > 0;
    },
    async listActiveUserIds(ids) {
      if (!ids.length) return new Set();
      const rows = await database
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, ids), eq(users.status, "active")));
      return new Set(rows.map((row) => row.id));
    },
  };
}
