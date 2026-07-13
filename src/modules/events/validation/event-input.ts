import type { EventInput } from "../types/event";

export type EventValidationResult =
  | { success: true; data: EventInput }
  | { success: false; errors: Record<string, string> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const zonedDatePattern = /(?:Z|[+-]\d{2}:\d{2})$/i;

export function validateEventInput(input: unknown): EventValidationResult {
  const values = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const title = typeof values.title === "string" ? values.title.trim() : "";
  const notes = typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null;
  const startsAtText = typeof values.startsAt === "string" ? values.startsAt : "";
  const endsAtText = typeof values.endsAt === "string" && values.endsAt ? values.endsAt : null;
  const startsAt = new Date(startsAtText);
  const endsAt = endsAtText ? new Date(endsAtText) : null;
  const setlistId = typeof values.setlistId === "string" && values.setlistId ? values.setlistId : null;
  const eventTypeId = typeof values.eventTypeId === "string" && values.eventTypeId ? values.eventTypeId : null;
  const rawAssignments = Array.isArray(values.assignments) ? values.assignments : [];
  const assignments = rawAssignments.map((value) => {
    const assignment = (value ?? {}) as Record<string, unknown>;
    return {
      userId: typeof assignment.userId === "string" ? assignment.userId : "",
      role: typeof assignment.role === "string" && assignment.role.trim() ? assignment.role.trim() : null,
    };
  });

  if (!title || title.length > 160) errors.title = "Le titre doit contenir entre 1 et 160 caractères.";
  if (notes && notes.length > 5_000) errors.notes = "Les notes ne peuvent pas dépasser 5 000 caractères.";
  if (!zonedDatePattern.test(startsAtText) || Number.isNaN(startsAt.getTime())) errors.startsAt = "La date et l’heure de début sont invalides.";
  if (endsAtText && (!zonedDatePattern.test(endsAtText) || Number.isNaN(endsAt?.getTime()))) errors.endsAt = "La date et l’heure de fin sont invalides.";
  if (endsAt && !Number.isNaN(startsAt.getTime()) && endsAt <= startsAt) errors.endsAt = "La fin doit être postérieure au début.";
  if (setlistId && !uuidPattern.test(setlistId)) errors.setlistId = "La setlist sélectionnée est invalide.";
  if (eventTypeId && !uuidPattern.test(eventTypeId)) errors.eventTypeId = "Le type d’événement sélectionné est invalide.";
  if (assignments.some((assignment) => !uuidPattern.test(assignment.userId) || (assignment.role?.length ?? 0) > 120)) errors.assignments = "Une affectation est invalide.";
  if (new Set(assignments.map((assignment) => assignment.userId)).size !== assignments.length) errors.assignments = "Une personne ne peut être affectée qu’une fois.";

  return Object.keys(errors).length
    ? { success: false, errors }
    : { success: true, data: { title, startsAt, endsAt, notes, setlistId, eventTypeId, assignments } };
}
