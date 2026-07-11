import { requirePermission } from "@/src/infrastructure/auth/require-admin";
import { notifyNewEventAssignments } from "@/src/modules/notifications/services/event-assignment-notifications";

import { createEventRepository, type EventRepository } from "../repositories/event-repository";
import type { EventInput, EventScope } from "../types/event";

export class EventSetlistNotFoundError extends Error {}
export class EventAssigneeInvalidError extends Error {}

async function assertRelations(
  input: EventInput,
  repository: EventRepository,
  existingAssignedUserIds: string[] = [],
) {
  if (input.setlistId && !(await repository.setlistExists(input.setlistId))) {
    throw new EventSetlistNotFoundError();
  }
  const userIds = input.assignments.map((assignment) => assignment.userId);
  const activeIds = await repository.listActiveUserIds(userIds);
  const existingIds = new Set(existingAssignedUserIds);
  if (userIds.some((id) => !activeIds.has(id) && !existingIds.has(id))) {
    throw new EventAssigneeInvalidError();
  }
}

export async function listEvents(
  scope: EventScope,
  repository: EventRepository = createEventRepository(),
) {
  const actor = await requirePermission("event.read");
  return repository.list(actor.id, scope);
}

export async function getEvent(
  id: string,
  repository: EventRepository = createEventRepository(),
) {
  const actor = await requirePermission("event.read");
  return repository.findById(id, actor.id);
}

export async function createEvent(
  input: EventInput,
  repository: EventRepository = createEventRepository(),
  notifyAssignments = notifyNewEventAssignments,
) {
  const actor = await requirePermission("event.manage");
  await assertRelations(input, repository);
  const event = await repository.create(input, actor.id);
  await notifyAssignments(event, input.assignments.map((assignment) => assignment.userId));
  return event;
}

export async function updateEvent(
  id: string,
  input: EventInput,
  repository: EventRepository = createEventRepository(),
  notifyAssignments = notifyNewEventAssignments,
) {
  const actor = await requirePermission("event.manage");
  const existing = await repository.findById(id, actor.id);
  if (!existing) return null;
  await assertRelations(input, repository, existing.assignments.map((assignment) => assignment.userId));
  const existingIds = new Set(existing.assignments.map((assignment) => assignment.userId));
  const event = await repository.update(id, input, actor.id);
  if (event) {
    await notifyAssignments(event, input.assignments
      .map((assignment) => assignment.userId)
      .filter((userId) => !existingIds.has(userId)));
  }
  return event;
}

export async function deleteEvent(
  id: string,
  repository: EventRepository = createEventRepository(),
) {
  await requirePermission("event.manage");
  return repository.delete(id);
}
