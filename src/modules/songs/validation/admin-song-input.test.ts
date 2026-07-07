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
        collectionNumber: null,
        spotifyUrl: null,
        youtubeUrl: null,
        chordProContent: "[C]Paroles",
        themeIds: [],
        labelIds: [],
      },
    });
  });

  it("normalizes a collection number", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      collectionNumber: " 42 ",
      chordProContent: "[C]Paroles",
    });

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        collectionNumber: 42,
      }),
    });
  });

  it("rejects invalid collection numbers", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      collectionNumber: "4.2",
      chordProContent: "[C]Paroles",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        collectionNumber: expect.any(String),
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

  it("normalizes unique theme and label selections", () => {
    const themeId = "11111111-1111-4111-8111-111111111111";
    const labelId = "22222222-2222-4222-8222-222222222222";
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[C]Paroles",
      themeIds: [themeId, themeId],
      labelIds: [labelId],
    });

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        themeIds: [themeId],
        labelIds: [labelId],
      }),
    });
  });

  it("accepts YouTube and Spotify links", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[C]Paroles",
      youtubeUrl: " https://youtu.be/example ",
      spotifyUrl: " https://open.spotify.com/track/example ",
    });

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        youtubeUrl: "https://youtu.be/example",
        spotifyUrl: "https://open.spotify.com/track/example",
      }),
    });
  });

  it("rejects links from another provider", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[C]Paroles",
      youtubeUrl: "https://example.com/video",
      spotifyUrl: "https://example.com/audio",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        youtubeUrl: expect.any(String),
        spotifyUrl: expect.any(String),
      },
    });
  });

  it("requires HTTPS external links", () => {
    const result = validateAdminSongInput({
      title: "Mon chant",
      slug: "mon-chant",
      chordProContent: "[C]Paroles",
      youtubeUrl: "http://youtube.com/watch?v=example",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        youtubeUrl: expect.any(String),
      },
    });
  });
});
