CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent($1)
$$;
--> statement-breakpoint
DROP INDEX IF EXISTS "songs_published_title_trigram_index";
--> statement-breakpoint
CREATE INDEX "songs_published_title_unaccent_trigram_index"
  ON "songs" USING gin (immutable_unaccent(lower("title")) gin_trgm_ops)
  WHERE "songs"."status" = 'published';
