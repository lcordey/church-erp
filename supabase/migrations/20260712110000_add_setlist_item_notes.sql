CREATE TABLE "setlist_item_team_notes" (
  "setlist_item_id" uuid PRIMARY KEY NOT NULL,
  "content" text NOT NULL,
  "updated_by_user_id" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "setlist_item_team_notes_content_not_blank" CHECK (btrim("content") <> '')
);
--> statement-breakpoint
CREATE TABLE "setlist_item_personal_notes" (
  "setlist_item_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "content" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "setlist_item_personal_notes_content_not_blank" CHECK (btrim("content") <> '')
);
--> statement-breakpoint
ALTER TABLE "setlist_item_team_notes" ADD CONSTRAINT "setlist_item_team_notes_setlist_item_id_setlist_items_id_fk" FOREIGN KEY ("setlist_item_id") REFERENCES "public"."setlist_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "setlist_item_team_notes" ADD CONSTRAINT "setlist_item_team_notes_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "setlist_item_personal_notes" ADD CONSTRAINT "setlist_item_personal_notes_setlist_item_id_setlist_items_id_fk" FOREIGN KEY ("setlist_item_id") REFERENCES "public"."setlist_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "setlist_item_personal_notes" ADD CONSTRAINT "setlist_item_personal_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "setlist_item_team_notes_updated_by_user_id_index" ON "setlist_item_team_notes" USING btree ("updated_by_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "setlist_item_personal_notes_item_user_unique" ON "setlist_item_personal_notes" USING btree ("setlist_item_id", "user_id");
--> statement-breakpoint
CREATE INDEX "setlist_item_personal_notes_user_id_index" ON "setlist_item_personal_notes" USING btree ("user_id");
--> statement-breakpoint
REVOKE ALL ON TABLE "setlist_item_team_notes" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "setlist_item_personal_notes" FROM anon, authenticated;
