import { describe, expect, it } from "vitest";

import { validateSetlistNoteInput } from "./setlist-note-input";

describe("setlist note input", () => {
  it("trims note content and accepts an empty note to remove it", () => {
    expect(validateSetlistNoteInput({ content: "  Reprendre le refrain.  " })).toEqual({
      success: true,
      data: { content: "Reprendre le refrain." },
    });
    expect(validateSetlistNoteInput({ content: "   " })).toEqual({
      success: true,
      data: { content: "" },
    });
  });

  it("rejects malformed and oversized notes", () => {
    expect(validateSetlistNoteInput({})).toMatchObject({ success: false });
    expect(validateSetlistNoteInput({ content: "x".repeat(5001) })).toMatchObject({ success: false });
  });
});
