ALTER TYPE "public"."point_kind" ADD VALUE IF NOT EXISTS 'penalty_missed';--> statement-breakpoint
ALTER TYPE "public"."match_incident_kind" ADD VALUE IF NOT EXISTS 'penalty_missed';--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN "vice_captain_multiplier" integer DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN "penalty_missed_pts" integer DEFAULT -2 NOT NULL;--> statement-breakpoint
UPDATE "scoring_rule_sets" SET "captain_multiplier" = "captain_multiplier" * 100 WHERE "captain_multiplier" > 0 AND "captain_multiplier" < 100;--> statement-breakpoint
UPDATE "scoring_rule_sets" SET "vice_captain_multiplier" = 150 WHERE "vice_captain_multiplier" IS NULL;--> statement-breakpoint
UPDATE "scoring_rule_sets" SET "penalty_missed_pts" = -2 WHERE "penalty_missed_pts" IS NULL;--> statement-breakpoint
ALTER TABLE "manager_score_lines" ALTER COLUMN "multiplier" SET DATA TYPE real USING "multiplier"::real;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD COLUMN "captain_multiplier_player_id" uuid;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD COLUMN "vice_captain_multiplier_player_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_matchday_scores" ADD CONSTRAINT "manager_matchday_scores_captain_multiplier_player_id_players_id_fk" FOREIGN KEY ("captain_multiplier_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_matchday_scores" ADD CONSTRAINT "manager_matchday_scores_vice_captain_multiplier_player_id_players_id_fk" FOREIGN KEY ("vice_captain_multiplier_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
