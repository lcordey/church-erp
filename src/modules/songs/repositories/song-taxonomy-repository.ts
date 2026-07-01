import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/src/infrastructure/database/client";
import {
  songLabels,
  songThemes,
} from "@/src/infrastructure/database/schema";

import type {
  SongTaxonomies,
  SongTaxonomyItem,
  SongTaxonomyKind,
} from "../types/song-taxonomy";

export class SongTaxonomyNameConflictError extends Error {
  constructor() {
    super("A taxonomy item with this name already exists.");
  }
}

export interface SongTaxonomyRepository {
  listAll(): Promise<SongTaxonomies>;
  create(kind: SongTaxonomyKind, name: string): Promise<SongTaxonomyItem>;
  update(
    kind: SongTaxonomyKind,
    id: string,
    name: string,
  ): Promise<SongTaxonomyItem | null>;
  delete(kind: SongTaxonomyKind, id: string): Promise<boolean>;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function createSongTaxonomyRepository(): SongTaxonomyRepository {
  const database = getDatabase();

  return {
    async listAll() {
      const [themes, labels] = await Promise.all([
        database
          .select({ id: songThemes.id, name: songThemes.name })
          .from(songThemes)
          .orderBy(asc(songThemes.name)),
        database
          .select({ id: songLabels.id, name: songLabels.name })
          .from(songLabels)
          .orderBy(asc(songLabels.name)),
      ]);

      return { themes, labels };
    },

    async create(kind, name) {
      try {
        if (kind === "theme") {
          const [created] = await database
            .insert(songThemes)
            .values({ name })
            .returning({ id: songThemes.id, name: songThemes.name });

          return created;
        }

        const [created] = await database
          .insert(songLabels)
          .values({ name })
          .returning({ id: songLabels.id, name: songLabels.name });

        return created;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new SongTaxonomyNameConflictError();
        }

        throw error;
      }
    },

    async update(kind, id, name) {
      try {
        if (kind === "theme") {
          const [updated] = await database
            .update(songThemes)
            .set({ name, updatedAt: new Date() })
            .where(eq(songThemes.id, id))
            .returning({ id: songThemes.id, name: songThemes.name });

          return updated ?? null;
        }

        const [updated] = await database
          .update(songLabels)
          .set({ name, updatedAt: new Date() })
          .where(eq(songLabels.id, id))
          .returning({ id: songLabels.id, name: songLabels.name });

        return updated ?? null;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new SongTaxonomyNameConflictError();
        }

        throw error;
      }
    },

    async delete(kind, id) {
      const deleted =
        kind === "theme"
          ? await database
              .delete(songThemes)
              .where(eq(songThemes.id, id))
              .returning({ id: songThemes.id })
          : await database
              .delete(songLabels)
              .where(eq(songLabels.id, id))
              .returning({ id: songLabels.id });

      return deleted.length > 0;
    },
  };
}
