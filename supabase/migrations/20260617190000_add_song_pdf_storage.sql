DROP INDEX "song_sources_one_active_chordpro_per_song";--> statement-breakpoint
CREATE UNIQUE INDEX "song_sources_one_active_source_per_song_type" ON "song_sources" USING btree ("song_id","source_type") WHERE "song_sources"."status" = 'active';--> statement-breakpoint
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'song-pdfs',
  'song-pdfs',
  false,
  20971520,
  array['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
