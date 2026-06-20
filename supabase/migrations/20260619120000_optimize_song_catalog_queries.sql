CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "songs_published_catalog_order_index"
  ON "songs" USING btree ("collection", "collection_number", "title")
  WHERE "songs"."status" = 'published';
--> statement-breakpoint
CREATE INDEX "songs_published_title_trigram_index"
  ON "songs" USING gin ("title" gin_trgm_ops)
  WHERE "songs"."status" = 'published';
--> statement-breakpoint
CREATE INDEX "song_sources_active_chordpro_song_id_index"
  ON "song_sources" USING btree ("song_id")
  WHERE "song_sources"."source_type" = 'chordpro'
    AND "song_sources"."status" = 'active';
