import { describe, expect, it, vi } from "vitest";

import type { SetlistRepository } from "../repositories/setlist-repository";
import type { SetlistDetail, SetlistInput, SetlistSummary } from "../types/setlist";
import {
  createSetlist,
  getSetlist,
  listSetlists,
  SetlistSongsNotPublishedError,
  updateSetlist,
} from "./setlist-management";

const { requireAdminAccess } = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(() => ({ accessMode: "mvp-admin" })),
}));

vi.mock("@/src/infrastructure/auth/require-admin", () => ({
  requireAdminAccess,
}));

const publishedSongId = "11111111-1111-4111-8111-111111111111";
const draftSongId = "22222222-2222-4222-8222-222222222222";

function createDetail(input: SetlistInput): SetlistDetail {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    title: input.title,
    songCount: input.songIds.length,
    createdAt: new Date("2026-06-18T10:00:00.000Z"),
    updatedAt: new Date("2026-06-18T10:00:00.000Z"),
    items: input.songIds.map((songId, position) => ({
      id: `${songId}-${position}`,
      position,
      song: {
        id: songId,
        title: `Chant ${position + 1}`,
        slug: `chant-${position + 1}`,
        author: null,
        copyright: null,
        defaultKey: "C",
        collection: "LeMont",
        collectionNumber: null,
        sourcePageUrl: null,
        pdfSource: null,
        musicXmlSource: null,
        chordProContent: "[C]Paroles",
      },
    })),
  };
}

function createRepository(publishedSongIds: string[]): SetlistRepository {
  return {
    async listAll(): Promise<SetlistSummary[]> {
      return [];
    },
    async findById() {
      return null;
    },
    async create(input) {
      return createDetail(input);
    },
    async update(_id, input) {
      return createDetail(input);
    },
    async delete() {
      return true;
    },
    async listPublishedSongIds(songIds) {
      return new Set(songIds.filter((songId) => publishedSongIds.includes(songId)));
    },
  };
}

describe("setlist management", () => {
  it("allows public setlist reads without requesting admin access", async () => {
    requireAdminAccess.mockClear();
    const repository = createRepository([publishedSongId]);

    await listSetlists(repository);
    await getSetlist("33333333-3333-4333-8333-333333333333", repository);

    expect(requireAdminAccess).not.toHaveBeenCalled();
  });

  it("creates a setlist with published songs in order", async () => {
    requireAdminAccess.mockClear();
    const setlist = await createSetlist(
      {
        title: " Dimanche matin ",
        songIds: [publishedSongId, publishedSongId],
      },
      createRepository([publishedSongId]),
    );

    expect(setlist.title).toBe("Dimanche matin");
    expect(setlist.items.map((item) => item.song.id)).toEqual([
      publishedSongId,
      publishedSongId,
    ]);
    expect(setlist.items.map((item) => item.position)).toEqual([0, 1]);
    expect(requireAdminAccess).toHaveBeenCalledOnce();
  });

  it("rejects songs that are not published", async () => {
    await expect(
      createSetlist(
        {
          title: "Dimanche matin",
          songIds: [publishedSongId, draftSongId],
        },
        createRepository([publishedSongId]),
      ),
    ).rejects.toBeInstanceOf(SetlistSongsNotPublishedError);
  });

  it("updates a setlist by replacing its ordered songs", async () => {
    const setlist = await updateSetlist(
      "33333333-3333-4333-8333-333333333333",
      {
        title: "Louange du soir",
        songIds: [publishedSongId],
      },
      createRepository([publishedSongId]),
    );

    expect(setlist?.title).toBe("Louange du soir");
    expect(setlist?.items).toHaveLength(1);
  });
});
