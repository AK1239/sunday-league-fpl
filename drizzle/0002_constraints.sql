CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "seasons"
ADD CONSTRAINT "seasons_no_overlap"
EXCLUDE USING gist (daterange("starts_on", "ends_on", '[]') WITH &&);--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_one_active_idx" ON "seasons" ((true)) WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "point_ledger_dedupe_idx" ON "point_ledger" (
  "matchday_id",
  "player_id",
  "kind",
  "match_id",
  "source_ref"
) NULLS NOT DISTINCT;
