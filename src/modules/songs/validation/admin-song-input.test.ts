import { describe, expect, it } from "vitest";

import { validateAdminSongInput } from "./admin-song-input";

describe("validateAdminSongInput", () => {
  it("normalizes valid song input", () => {
    const result = validateAdminSongInput({
      title: "  Mon chant  ",
      slug: "  MON-CHANT ",
      author: "  Une autrice ",
      copyright: "  © Exemple  ",
      chordProContent: "  [C]Paroles  ",
    });

    expect(result).toEqual({
      success: true,
      data: {
        title: "Mon chant",
        slug: "mon-chant",
        author: "Une autrice",
        copyright: "© Exemple",
        defaultKey: null,
        chordProContent: "[C]Paroles",
      },
    });
  });

  it("returns field errors for incomplete input", () => {
    const result = validateAdminSongInput({
      title: "",
      slug: "Slug invalide",
      chordProContent: "",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        title: expect.any(String),
        slug: expect.any(String),
        chordProContent: expect.any(String),
      },
    });
  });

  it("rejects a key outside the supported canonical list", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      defaultKey: "H",
      chordProContent: "[C]Paroles",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        defaultKey: expect.any(String),
      },
    });
  });

  it("rejects chord roots outside A to G", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[Sb]Paroles",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        chordProContent: expect.stringContaining('"S"'),
      },
    });
  });

  it("rejects french chord notation", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[Do]Paroles",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        chordProContent: expect.stringContaining('"Do"'),
      },
    });
  });

  it("names the unsupported chord character", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[C*]Paroles",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        chordProContent: expect.stringContaining('"*"'),
      },
    });
  });

  it("accepts supported english chord roots with suffixes and slash bass", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent:
        "[C]Une ligne [G]avec [G#]des [C#m]accords [F/A]et [Bb]valides",
    });

    expect(result).toMatchObject({
      success: true,
    });
  });
});
