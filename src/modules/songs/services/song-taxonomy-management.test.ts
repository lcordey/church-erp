import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/infrastructure/auth/require-admin", () => ({
  requireAdminAccess: () => ({ accessMode: "mvp-admin" }),
}));

import type { SongTaxonomyRepository } from "../repositories/song-taxonomy-repository";
import {
  createSongTaxonomyItem,
  deleteSongTaxonomyItem,
  InvalidSongTaxonomyNameError,
  updateSongTaxonomyItem,
} from "./song-taxonomy-management";

function createRepository(): SongTaxonomyRepository {
  return {
    listAll: vi.fn(async () => ({ themes: [], labels: [] })),
    create: vi.fn(async (_kind, name) => ({ id: "theme-id", name })),
    update: vi.fn(async (_kind, id, name) => ({ id, name })),
    delete: vi.fn(async () => true),
  };
}

describe("song taxonomy management", () => {
  it("normalizes names before creating an item", async () => {
    const repository = createRepository();

    await expect(
      createSongTaxonomyItem("theme", "  Sainte   Cène  ", repository),
    ).resolves.toEqual({
      id: "theme-id",
      name: "Sainte Cène",
    });
    expect(repository.create).toHaveBeenCalledWith("theme", "Sainte Cène");
  });

  it("rejects blank names", async () => {
    await expect(
      updateSongTaxonomyItem("label", "label-id", " ", createRepository()),
    ).rejects.toBeInstanceOf(InvalidSongTaxonomyNameError);
  });

  it("deletes only the requested vocabulary item", async () => {
    const repository = createRepository();

    await deleteSongTaxonomyItem("label", "label-id", repository);

    expect(repository.delete).toHaveBeenCalledWith("label", "label-id");
  });
});
