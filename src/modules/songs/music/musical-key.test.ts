import { describe, expect, it } from "vitest";

import {
  formatChord,
  formatMusicalKey,
  getKeyTransposition,
  getKeysForMode,
  isMusicalKey,
  transposeChord,
} from "./musical-key";

describe("musical key notation", () => {
  it("validates supported major and minor keys", () => {
    expect(isMusicalKey("C")).toBe(true);
    expect(isMusicalKey("F#m")).toBe(true);
    expect(isMusicalKey("H")).toBe(false);
  });

  it("formats keys in French notation", () => {
    expect(formatMusicalKey("C", "french")).toBe("Do");
    expect(formatMusicalKey("Bbm", "french")).toBe("Sibm");
  });

  it("formats extended chords and slash bass notes", () => {
    expect(formatChord("C#m7/G#", "french")).toBe("Do#m7/Sol#");
    expect(formatChord("Dsus4", "english")).toBe("Dsus4");
  });

  it("transposes complete chords without changing their quality", () => {
    expect(transposeChord("C#m7/G#", 2)).toBe("Ebm7/Bb");
    expect(transposeChord("F", -1)).toBe("E");
  });

  it("calculates a display-only transposition between keys", () => {
    expect(getKeyTransposition("C", "E")).toBe(4);
    expect(getKeyTransposition("Am", "Cm")).toBe(3);
  });

  it("keeps major and minor target choices separate", () => {
    expect(getKeysForMode("C")).toContain("Bb");
    expect(getKeysForMode("C")).not.toContain("Bbm");
    expect(getKeysForMode("Am")).toContain("Bbm");
  });
});
