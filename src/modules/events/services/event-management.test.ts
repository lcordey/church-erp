import { describe, expect, it, vi } from "vitest";

import type { EventRepository } from "../repositories/event-repository";
import type { EventDetail, EventInput } from "../types/event";
import { createEvent, updateEvent } from "./event-management";

const { requirePermission } = vi.hoisted(() => ({
  requirePermission: vi.fn(() => ({ id: "actor-id" })),
}));

vi.mock("@/src/infrastructure/auth/require-admin", () => ({ requirePermission }));

const startsAt = new Date("2026-07-12T08:00:00.000Z");

function detail(input: EventInput): EventDetail {
  return {
    id: "event-id",
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    notes: input.notes,
    setlist: null,
    assignmentCount: input.assignments.length,
    isCurrentUserAssigned: false,
    assignments: input.assignments.map((assignment, index) => ({
      id: `assignment-${index}`,
      userId: assignment.userId,
      displayName: assignment.userId,
      username: assignment.userId,
      userStatus: "active",
      role: assignment.role,
    })),
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}

function repository(existing: EventDetail | null = null): EventRepository {
  return {
    async list() { return []; },
    async findById() { return existing; },
    async create(input) { return detail(input); },
    async update(_id, input) { return detail(input); },
    async delete() { return true; },
    async setlistExists() { return true; },
    async listActiveUserIds(ids) { return new Set(ids); },
  };
}

const baseInput: EventInput = {
  title: "Culte",
  startsAt,
  endsAt: null,
  notes: null,
  setlistId: null,
  assignments: [{ userId: "alice", role: "Chant" }],
};

describe("event assignment notifications", () => {
  it("notifies every assignment created with an event except its creator", async () => {
    const notify = vi.fn();
    await createEvent(baseInput, repository(), notify);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ id: "event-id" }), ["alice"]);
  });

  it("does not notify the creator when they assign themselves", async () => {
    const notify = vi.fn();
    await createEvent({ ...baseInput, assignments: [{ userId: "actor-id", role: "Chant" }] }, repository(), notify);
    expect(notify).toHaveBeenCalledWith(expect.anything(), []);
  });

  it("only notifies users newly added during an update", async () => {
    const existing = detail(baseInput);
    const notify = vi.fn();
    await updateEvent("event-id", {
      ...baseInput,
      assignments: [
        { userId: "alice", role: "Soliste" },
        { userId: "bob", role: "Piano" },
      ],
    }, repository(existing), notify);
    expect(notify).toHaveBeenCalledWith(expect.anything(), ["bob"]);
  });
});
