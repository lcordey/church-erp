CREATE TABLE "setlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "setlists_title_not_blank" CHECK (btrim("setlists"."title") <> '')
);
--> statement-breakpoint
CREATE TABLE "setlist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "setlist_id" uuid NOT NULL,
  "song_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "setlist_items_position_non_negative" CHECK ("setlist_items"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "setlist_items" ADD CONSTRAINT "setlist_items_setlist_id_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "setlist_items" ADD CONSTRAINT "setlist_items_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "setlist_items_setlist_id_index" ON "setlist_items" USING btree ("setlist_id");
--> statement-breakpoint
CREATE INDEX "setlist_items_song_id_index" ON "setlist_items" USING btree ("song_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "setlist_items_setlist_position_unique" ON "setlist_items" USING btree ("setlist_id","position");
--> statement-breakpoint
REVOKE ALL ON TABLE "setlists" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "setlist_items" FROM anon, authenticated;
