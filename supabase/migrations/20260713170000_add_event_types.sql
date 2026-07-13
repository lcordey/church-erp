CREATE TABLE "event_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "event_types_name_not_blank" CHECK (btrim("name") <> '')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "event_types_name_unique" ON "event_types" USING btree (lower("name"));
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_type_id" uuid;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_event_type_id_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "events_event_type_id_index" ON "events" USING btree ("event_type_id");
--> statement-breakpoint
REVOKE ALL ON TABLE "event_types" FROM anon, authenticated;
