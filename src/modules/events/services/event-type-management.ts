import { requirePermission } from "@/src/infrastructure/auth/require-admin";

import { createEventTypeRepository, type EventTypeRepository } from "../repositories/event-type-repository";
import type { EventType } from "../types/event";

export class InvalidEventTypeNameError extends Error {}

function normalizeName(name: unknown): string {
  if (typeof name !== "string") throw new InvalidEventTypeNameError();
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 80) throw new InvalidEventTypeNameError();
  return normalized;
}

export async function listEventTypes(repository: EventTypeRepository = createEventTypeRepository()): Promise<EventType[]> { return repository.list(); }
export async function listAdminEventTypes(repository: EventTypeRepository = createEventTypeRepository()): Promise<EventType[]> { await requirePermission("taxonomy.read"); return repository.list(); }
export async function createEventType(name: unknown, repository: EventTypeRepository = createEventTypeRepository()): Promise<EventType> { await requirePermission("taxonomy.manage"); return repository.create(normalizeName(name)); }
export async function deleteEventType(id: string, repository: EventTypeRepository = createEventTypeRepository()): Promise<boolean> { await requirePermission("taxonomy.manage"); return repository.delete(id); }
