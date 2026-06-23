ALTER TABLE "song_sources"
  DROP CONSTRAINT "song_sources_content_matches_type";--> statement-breakpoint
ALTER TABLE "song_sources"
  ADD CONSTRAINT "song_sources_content_matches_type" CHECK ((
    ("song_sources"."source_type" = 'chordpro' and nullif(btrim("song_sources"."text_content"), '') is not null)
    or ("song_sources"."source_type" = 'musicxml' and nullif(btrim("song_sources"."text_content"), '') is not null)
    or ("song_sources"."source_type" = 'pdf' and nullif(btrim("song_sources"."storage_path"), '') is not null)
    or ("song_sources"."source_type" = 'youtube' and nullif(btrim("song_sources"."external_url"), '') is not null)
  ));
