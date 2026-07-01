CREATE TABLE "song_themes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "song_themes_name_not_blank" CHECK (btrim("name") <> '')
);
--> statement-breakpoint
CREATE TABLE "song_labels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "song_labels_name_not_blank" CHECK (btrim("name") <> '')
);
--> statement-breakpoint
CREATE TABLE "song_theme_assignments" (
  "song_id" uuid NOT NULL,
  "theme_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_label_assignments" (
  "song_id" uuid NOT NULL,
  "label_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song_theme_assignments" ADD CONSTRAINT "song_theme_assignments_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "song_theme_assignments" ADD CONSTRAINT "song_theme_assignments_theme_id_song_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."song_themes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "song_label_assignments" ADD CONSTRAINT "song_label_assignments_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "song_label_assignments" ADD CONSTRAINT "song_label_assignments_label_id_song_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."song_labels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "song_themes_name_unique" ON "song_themes" USING btree (lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX "song_labels_name_unique" ON "song_labels" USING btree (lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX "song_theme_assignments_song_theme_unique" ON "song_theme_assignments" USING btree ("song_id", "theme_id");
--> statement-breakpoint
CREATE INDEX "song_theme_assignments_theme_id_index" ON "song_theme_assignments" USING btree ("theme_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "song_label_assignments_song_label_unique" ON "song_label_assignments" USING btree ("song_id", "label_id");
--> statement-breakpoint
CREATE INDEX "song_label_assignments_label_id_index" ON "song_label_assignments" USING btree ("label_id");
--> statement-breakpoint
REVOKE ALL ON TABLE "song_themes" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "song_labels" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "song_theme_assignments" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "song_label_assignments" FROM anon, authenticated;
