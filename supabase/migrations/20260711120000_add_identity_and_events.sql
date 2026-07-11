CREATE TYPE "user_status" AS ENUM ('active', 'disabled');
--> statement-breakpoint
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "display_name" text NOT NULL,
  "password_hash" text NOT NULL,
  "status" "user_status" DEFAULT 'active' NOT NULL,
  "must_change_password" boolean DEFAULT true NOT NULL,
  "failed_login_count" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_username_not_blank" CHECK (btrim("username") <> ''),
  CONSTRAINT "users_display_name_not_blank" CHECK (btrim("display_name") <> ''),
  CONSTRAINT "users_failed_login_count_non_negative" CHECK ("failed_login_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_unique" ON "users" USING btree (lower("username"));
--> statement-breakpoint
CREATE TABLE "groups" (
  "code" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "groups_code_not_blank" CHECK (btrim("code") <> ''),
  CONSTRAINT "groups_name_not_blank" CHECK (btrim("name") <> '')
);
--> statement-breakpoint
INSERT INTO "groups" ("code", "name") VALUES
  ('worship', 'Louange'),
  ('admin', 'Administration');
--> statement-breakpoint
CREATE TABLE "user_group_memberships" (
  "user_id" uuid NOT NULL,
  "group_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_group_code_groups_code_fk" FOREIGN KEY ("group_code") REFERENCES "public"."groups"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_group_memberships_user_group_unique" ON "user_group_memberships" USING btree ("user_id", "group_code");
--> statement-breakpoint
CREATE INDEX "user_group_memberships_group_code_index" ON "user_group_memberships" USING btree ("group_code");
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_unique" ON "auth_sessions" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_index" ON "auth_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_index" ON "auth_sessions" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "notes" text,
  "setlist_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "events_title_not_blank" CHECK (btrim("title") <> ''),
  CONSTRAINT "events_ends_after_start" CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_setlist_id_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlists"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "events_starts_at_index" ON "events" USING btree ("starts_at");
--> statement-breakpoint
CREATE INDEX "events_setlist_id_index" ON "events" USING btree ("setlist_id");
--> statement-breakpoint
CREATE TABLE "event_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "event_assignments_event_user_unique" ON "event_assignments" USING btree ("event_id", "user_id");
--> statement-breakpoint
CREATE INDEX "event_assignments_user_id_index" ON "event_assignments" USING btree ("user_id");
--> statement-breakpoint
REVOKE ALL ON TABLE "users", "groups", "user_group_memberships", "auth_sessions", "events", "event_assignments" FROM anon, authenticated;
