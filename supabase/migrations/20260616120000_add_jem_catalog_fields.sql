ALTER TABLE "songs" ADD COLUMN "copyright" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "collection" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "collection_number" integer;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "source_page_url" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "is_editable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" DROP CONSTRAINT "songs_language_not_blank";--> statement-breakpoint
DROP INDEX "songs_language_index";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "language";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "original_title";--> statement-breakpoint
CREATE UNIQUE INDEX "songs_collection_number_unique" ON "songs" USING btree ("collection","collection_number") WHERE "songs"."collection" is not null and "songs"."collection_number" is not null;--> statement-breakpoint
CREATE INDEX "songs_collection_index" ON "songs" USING btree ("collection");--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_collection_number_positive" CHECK ("songs"."collection_number" is null or "songs"."collection_number" > 0);
