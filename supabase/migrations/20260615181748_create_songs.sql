CREATE TYPE "public"."song_source_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."song_source_type" AS ENUM('chordpro', 'pdf', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."song_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "song_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"source_type" "song_source_type" NOT NULL,
	"status" "song_source_status" DEFAULT 'active' NOT NULL,
	"text_content" text,
	"storage_path" text,
	"file_name" text,
	"mime_type" text,
	"file_size_bytes" integer,
	"external_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_sources_content_matches_type" CHECK ((
        ("song_sources"."source_type" = 'chordpro' and nullif(btrim("song_sources"."text_content"), '') is not null)
        or ("song_sources"."source_type" = 'pdf' and nullif(btrim("song_sources"."storage_path"), '') is not null)
        or ("song_sources"."source_type" = 'youtube' and nullif(btrim("song_sources"."external_url"), '') is not null)
      )),
	CONSTRAINT "song_sources_file_size_non_negative" CHECK ("song_sources"."file_size_bytes" is null or "song_sources"."file_size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"language" text NOT NULL,
	"status" "song_status" DEFAULT 'draft' NOT NULL,
	"original_title" text,
	"author" text,
	"default_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "songs_title_not_blank" CHECK (btrim("songs"."title") <> ''),
	CONSTRAINT "songs_slug_not_blank" CHECK (btrim("songs"."slug") <> ''),
	CONSTRAINT "songs_language_not_blank" CHECK (btrim("songs"."language") <> '')
);
--> statement-breakpoint
ALTER TABLE "song_sources" ADD CONSTRAINT "song_sources_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_sources_song_id_index" ON "song_sources" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "song_sources_source_type_index" ON "song_sources" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "song_sources_song_type_status_index" ON "song_sources" USING btree ("song_id","source_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "song_sources_one_active_chordpro_per_song" ON "song_sources" USING btree ("song_id") WHERE "song_sources"."source_type" = 'chordpro' and "song_sources"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "songs_slug_unique" ON "songs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "songs_status_index" ON "songs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "songs_language_index" ON "songs" USING btree ("language");--> statement-breakpoint
REVOKE ALL ON TABLE "songs" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "song_sources" FROM anon, authenticated;
