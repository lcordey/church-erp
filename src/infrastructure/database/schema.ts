import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const songStatus = pgEnum("song_status", ["draft", "published"]);
export const songSourceType = pgEnum("song_source_type", [
  "chordpro",
  "pdf",
  "youtube",
]);
export const songSourceStatus = pgEnum("song_source_status", [
  "active",
  "archived",
]);

export const songs = pgTable(
  "songs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    status: songStatus("status").default("draft").notNull(),
    author: text("author"),
    copyright: text("copyright"),
    defaultKey: text("default_key"),
    collection: text("collection"),
    collectionNumber: integer("collection_number"),
    sourcePageUrl: text("source_page_url"),
    isEditable: boolean("is_editable").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("songs_slug_unique").on(table.slug),
    uniqueIndex("songs_collection_number_unique")
      .on(table.collection, table.collectionNumber)
      .where(
        sql`${table.collection} is not null and ${table.collectionNumber} is not null`,
      ),
    index("songs_status_index").on(table.status),
    index("songs_collection_index").on(table.collection),
    check("songs_title_not_blank", sql`btrim(${table.title}) <> ''`),
    check("songs_slug_not_blank", sql`btrim(${table.slug}) <> ''`),
    check(
      "songs_collection_number_positive",
      sql`${table.collectionNumber} is null or ${table.collectionNumber} > 0`,
    ),
  ],
);

export const songSources = pgTable(
  "song_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    sourceType: songSourceType("source_type").notNull(),
    status: songSourceStatus("status").default("active").notNull(),
    textContent: text("text_content"),
    storagePath: text("storage_path"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSizeBytes: integer("file_size_bytes"),
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("song_sources_song_id_index").on(table.songId),
    index("song_sources_source_type_index").on(table.sourceType),
    index("song_sources_song_type_status_index").on(
      table.songId,
      table.sourceType,
      table.status,
    ),
    uniqueIndex("song_sources_one_active_chordpro_per_song")
      .on(table.songId)
      .where(
        sql`${table.sourceType} = 'chordpro' and ${table.status} = 'active'`,
      ),
    check(
      "song_sources_content_matches_type",
      sql`(
        (${table.sourceType} = 'chordpro' and nullif(btrim(${table.textContent}), '') is not null)
        or (${table.sourceType} = 'pdf' and nullif(btrim(${table.storagePath}), '') is not null)
        or (${table.sourceType} = 'youtube' and nullif(btrim(${table.externalUrl}), '') is not null)
      )`,
    ),
    check(
      "song_sources_file_size_non_negative",
      sql`${table.fileSizeBytes} is null or ${table.fileSizeBytes} >= 0`,
    ),
  ],
);

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type SongSource = typeof songSources.$inferSelect;
export type NewSongSource = typeof songSources.$inferInsert;
