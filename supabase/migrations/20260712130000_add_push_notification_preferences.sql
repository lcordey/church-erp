ALTER TABLE "push_subscriptions"
  ADD COLUMN "event_assignment_enabled" boolean DEFAULT true NOT NULL,
  ADD COLUMN "event_setlist_enabled" boolean DEFAULT true NOT NULL;
