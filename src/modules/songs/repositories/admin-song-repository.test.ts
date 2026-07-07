import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDatabase } = vi.hoisted(() => ({
  getDatabase: vi.fn(),
}));

vi.mock("@/src/infrastructure/database/client", () => ({
  getDatabase,
}));

import { createAdminSongRepository } from "./admin-song-repository";

type QueryTerminal = "where" | "limit" | "orderBy" | "returning" | "values";

function createQueryMock<T>(result: T, terminal: QueryTerminal) {
  const builder: Record<string, unknown> = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    set: vi.fn(() => builder),
  };

  builder.where = vi.fn(() =>
    terminal === "where" ? Promise.resolve(result) : builder,
  );
  builder.limit = vi.fn(() =>
    terminal === "limit" ? Promise.resolve(result) : builder,
  );
  builder.orderBy = vi.fn(() =>
    terminal === "orderBy" ? Promise.resolve(result) : builder,
  );
  builder.returning = vi.fn(() =>
    terminal === "returning" ? Promise.resolve(result) : builder,
  );
  builder.values = vi.fn(() =>
    terminal === "values" ? Promise.resolve(result) : builder,
  );

  return builder;
}

describe("admin song repository", () => {
  beforeEach(() => {
    getDatabase.mockReset();
  });

  it("loads a song even when no active chordpro source exists", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(
        createQueryMock(
          [
            {
              id: "song-1",
              title: "Recueil",
              slug: "recueil",
              status: "draft",
              author: null,
              copyright: null,
              defaultKey: null,
              collection: "LeMont",
              collectionNumber: 12,
              sourcePageUrl: null,
              sourceChordProUrl: null,
              spotifyUrl: null,
              youtubeUrl: "https://youtu.be/example",
              isEditable: true,
              chordProContent: null,
              createdAt: new Date("2026-07-05T09:00:00Z"),
              updatedAt: new Date("2026-07-05T09:00:00Z"),
            },
          ],
          "limit",
        ),
      )
      .mockReturnValueOnce(createQueryMock([], "where"))
      .mockReturnValueOnce(createQueryMock([], "where"))
      .mockReturnValueOnce(createQueryMock([], "orderBy"))
      .mockReturnValueOnce(createQueryMock([], "orderBy"));

    getDatabase.mockReturnValue({
      select,
    });

    const repository = createAdminSongRepository();
    const song = await repository.findById("song-1");

    expect(song).toMatchObject({
      id: "song-1",
      chordProContent: "",
      youtubeUrl: "https://youtu.be/example",
      pdfSource: null,
      musicXmlSource: null,
      themes: [],
      labels: [],
    });
  });

  it("creates a chordpro source on update when the song has none yet", async () => {
    const insertValues = vi.fn(() => Promise.resolve(undefined));
    const updateSongQuery = createQueryMock([{ id: "song-1" }], "returning");
    const transaction = {
      update: vi
        .fn()
        .mockReturnValueOnce(updateSongQuery)
        .mockReturnValueOnce(createQueryMock(undefined, "where"))
        .mockReturnValueOnce(createQueryMock(undefined, "where")),
      select: vi.fn(() =>
        createQueryMock([], "limit"),
      ),
      insert: vi.fn(() => ({
        values: insertValues,
      })),
      delete: vi.fn(() => createQueryMock(undefined, "where")),
    };

    const select = vi
      .fn()
      .mockReturnValueOnce(
        createQueryMock(
          [
            {
              id: "song-1",
              title: "Recueil",
              slug: "recueil",
              status: "draft",
              author: null,
              copyright: null,
              defaultKey: "C",
              collection: "LeMont",
              collectionNumber: 12,
              sourcePageUrl: null,
              sourceChordProUrl: null,
              spotifyUrl: null,
              youtubeUrl: "https://youtu.be/example",
              isEditable: true,
              chordProContent: "[C]Texte",
              createdAt: new Date("2026-07-05T09:00:00Z"),
              updatedAt: new Date("2026-07-05T09:05:00Z"),
            },
          ],
          "limit",
        ),
      )
      .mockReturnValueOnce(createQueryMock([], "where"))
      .mockReturnValueOnce(createQueryMock([], "where"))
      .mockReturnValueOnce(createQueryMock([], "orderBy"))
      .mockReturnValueOnce(createQueryMock([], "orderBy"));

    getDatabase.mockReturnValue({
      select,
      transaction: vi.fn(async (callback) => callback(transaction)),
    });

    const repository = createAdminSongRepository();
    const song = await repository.update("song-1", {
      title: "Recueil",
      slug: "recueil",
      author: null,
      copyright: null,
      defaultKey: "C",
      collectionNumber: 12,
      spotifyUrl: null,
      youtubeUrl: "https://youtu.be/example",
      chordProContent: "[C]Texte",
      themeIds: [],
      labelIds: [],
    });

    expect(updateSongQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionNumber: 12,
      }),
    );
    expect(insertValues).toHaveBeenCalledWith({
      songId: "song-1",
      sourceType: "chordpro",
      status: "active",
      textContent: "[C]Texte",
    });
    expect(insertValues).toHaveBeenCalledWith({
      songId: "song-1",
      sourceType: "youtube",
      status: "active",
      externalUrl: "https://youtu.be/example",
    });
    expect(song?.chordProContent).toBe("[C]Texte");
  });
});
