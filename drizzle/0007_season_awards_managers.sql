ALTER TYPE "season_award" ADD VALUE IF NOT EXISTS 'manager_champion';--> statement-breakpoint
ALTER TABLE "season_awards" ALTER COLUMN "player_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "season_awards" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_winner_check" CHECK (((player_id IS NOT NULL)::integer + (manager_id IS NOT NULL)::integer) = 1);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "season_awards_season_award_unique" ON "season_awards" ("season_id", "award");
