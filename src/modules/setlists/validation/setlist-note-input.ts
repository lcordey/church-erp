export type SetlistNoteValidationResult =
  | { success: true; data: { content: string } }
  | { success: false; message: string };

const maximumNoteLength = 5000;

export function validateSetlistNoteInput(input: unknown): SetlistNoteValidationResult {
  if (!input || typeof input !== "object" || typeof (input as { content?: unknown }).content !== "string") {
    return { success: false, message: "La note est invalide." };
  }

  const content = (input as { content: string }).content.trim();

  if (content.length > maximumNoteLength) {
    return { success: false, message: "La note ne peut pas dépasser 5 000 caractères." };
  }

  return { success: true, data: { content } };
}
