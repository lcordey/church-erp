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
  "musicxml",
  "pdf",
  "spotify",
  "youtube",
]);
export const songSourceStatus = pgEnum("song_source_status", [
  "active",
  "archived",
]);
export const userStatus = pgEnum("user_status", ["active", "disabled"]);

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
    index("songs_published_catalog_order_index")
      .on(table.collection, table.collectionNumber, table.title)
      .where(sql`${table.status} = 'published'`),
    index("songs_published_title_unaccent_trigram_index")
      .using("gin", sql`immutable_unaccent(lower(${table.title})) gin_trgm_ops`)
      .where(sql`${table.status} = 'published'`),
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
    index("song_sources_active_chordpro_song_id_index")
      .on(table.songId)
      .where(
        sql`${table.sourceType} = 'chordpro' and ${table.status} = 'active'`,
      ),
    uniqueIndex("song_sources_one_active_source_per_song_type")
      .on(table.songId, table.sourceType)
      .where(sql`${table.status} = 'active'`),
    check(
      "song_sources_content_matches_type",
      sql`(
        (${table.sourceType} = 'chordpro' and nullif(btrim(${table.textContent}), '') is not null)
        or (${table.sourceType} = 'musicxml' and nullif(btrim(${table.textContent}), '') is not null)
        or (${table.sourceType} = 'pdf' and nullif(btrim(${table.storagePath}), '') is not null)
        or (${table.sourceType} = 'spotify' and nullif(btrim(${table.externalUrl}), '') is not null)
        or (${table.sourceType} = 'youtube' and nullif(btrim(${table.externalUrl}), '') is not null)
      )`,
    ),
    check(
      "song_sources_file_size_non_negative",
      sql`${table.fileSizeBytes} is null or ${table.fileSizeBytes} >= 0`,
    ),
  ],
);

export const songThemes = pgTable(
  "song_themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("song_themes_name_unique").on(sql`lower(${table.name})`),
    check("song_themes_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

export const songLabels = pgTable(
  "song_labels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("song_labels_name_unique").on(sql`lower(${table.name})`),
    check("song_labels_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

export const songThemeAssignments = pgTable(
  "song_theme_assignments",
  {
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => songThemes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("song_theme_assignments_song_theme_unique").on(
      table.songId,
      table.themeId,
    ),
    index("song_theme_assignments_theme_id_index").on(table.themeId),
  ],
);

export const songLabelAssignments = pgTable(
  "song_label_assignments",
  {
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => songLabels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("song_label_assignments_song_label_unique").on(
      table.songId,
      table.labelId,
    ),
    index("song_label_assignments_label_id_index").on(table.labelId),
  ],
);

export const setlists = pgTable(
  "setlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("setlists_title_not_blank", sql`btrim(${table.title}) <> ''`),
  ],
);

export const setlistItems = pgTable(
  "setlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setlistId: uuid("setlist_id")
      .notNull()
      .references(() => setlists.id, { onDelete: "cascade" }),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("setlist_items_setlist_id_index").on(table.setlistId),
    index("setlist_items_song_id_index").on(table.songId),
    uniqueIndex("setlist_items_setlist_position_unique").on(
      table.setlistId,
      table.position,
    ),
    check("setlist_items_position_non_negative", sql`${table.position} >= 0`),
  ],
);

export const setlistItemTeamNotes = pgTable(
  "setlist_item_team_notes",
  {
    setlistItemId: uuid("setlist_item_id")
      .primaryKey()
      .references(() => setlistItems.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("setlist_item_team_notes_updated_by_user_id_index").on(
      table.updatedByUserId,
    ),
    check(
      "setlist_item_team_notes_content_not_blank",
      sql`btrim(${table.content}) <> ''`,
    ),
  ],
);

export const setlistItemPersonalNotes = pgTable(
  "setlist_item_personal_notes",
  {
    setlistItemId: uuid("setlist_item_id")
      .notNull()
      .references(() => setlistItems.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("setlist_item_personal_notes_item_user_unique").on(
      table.setlistItemId,
      table.userId,
    ),
    index("setlist_item_personal_notes_user_id_index").on(table.userId),
    check(
      "setlist_item_personal_notes_content_not_blank",
      sql`btrim(${table.content}) <> ''`,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: userStatus("status").default("active").notNull(),
    mustChangePassword: boolean("must_change_password").default(true).notNull(),
    failedLoginCount: integer("failed_login_count").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_username_lower_unique").on(sql`lower(${table.username})`),
    check("users_username_not_blank", sql`btrim(${table.username}) <> ''`),
    check("users_display_name_not_blank", sql`btrim(${table.displayName}) <> ''`),
    check("users_failed_login_count_non_negative", sql`${table.failedLoginCount} >= 0`),
  ],
);

export const groups = pgTable(
  "groups",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("groups_code_not_blank", sql`btrim(${table.code}) <> ''`),
    check("groups_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

export const userGroupMemberships = pgTable(
  "user_group_memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupCode: text("group_code")
      .notNull()
      .references(() => groups.code, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_group_memberships_user_group_unique").on(
      table.userId,
      table.groupCode,
    ),
    index("user_group_memberships_group_code_index").on(table.groupCode),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_user_id_index").on(table.userId),
    index("auth_sessions_expires_at_index").on(table.expiresAt),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    expirationTime: timestamp("expiration_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    index("push_subscriptions_user_id_index").on(table.userId),
    check("push_subscriptions_endpoint_not_blank", sql`btrim(${table.endpoint}) <> ''`),
    check("push_subscriptions_p256dh_not_blank", sql`btrim(${table.p256dh}) <> ''`),
    check("push_subscriptions_auth_not_blank", sql`btrim(${table.auth}) <> ''`),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    notes: text("notes"),
    setlistId: uuid("setlist_id").references(() => setlists.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("events_starts_at_index").on(table.startsAt),
    index("events_setlist_id_index").on(table.setlistId),
    check("events_title_not_blank", sql`btrim(${table.title}) <> ''`),
    check(
      "events_ends_after_start",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const eventAssignments = pgTable(
  "event_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("event_assignments_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
    index("event_assignments_user_id_index").on(table.userId),
  ],
);

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type SongSource = typeof songSources.$inferSelect;
export type NewSongSource = typeof songSources.$inferInsert;
export type SongTheme = typeof songThemes.$inferSelect;
export type NewSongTheme = typeof songThemes.$inferInsert;
export type SongLabel = typeof songLabels.$inferSelect;
export type NewSongLabel = typeof songLabels.$inferInsert;
export type Setlist = typeof setlists.$inferSelect;
export type NewSetlist = typeof setlists.$inferInsert;
export type SetlistItem = typeof setlistItems.$inferSelect;
export type NewSetlistItem = typeof setlistItems.$inferInsert;
export type SetlistItemTeamNote = typeof setlistItemTeamNotes.$inferSelect;
export type SetlistItemPersonalNote = typeof setlistItemPersonalNotes.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type UserGroupMembership = typeof userGroupMemberships.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventAssignment = typeof eventAssignments.$inferSelect;
