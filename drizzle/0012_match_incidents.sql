-- Extra scoring events: penalty goals, own goals, penalty saves, handballs that stop a goal.
ALTER TYPE "public"."point_kind" ADD VALUE IF NOT EXISTS 'own_goal';--> statement-breakpoint
ALTER TYPE "public"."point_kind" ADD VALUE IF NOT EXISTS 'penalty_saved';--> statement-breakpoint
ALTER TYPE "public"."point_kind" ADD VALUE IF NOT EXISTS 'handball';--> statement-breakpoint
CREATE TYPE "public"."goal_kind" AS ENUM('open_play', 'penalty', 'own_goal');--> statement-breakpoint
CREATE TYPE "public"."match_incident_kind" AS ENUM('penalty_saved', 'handball_blocked');--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "kind" "goal_kind" DEFAULT 'open_play' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_assist_only_open_play" CHECK ("kind" = 'open_play' OR "assist_id" IS NULL);--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN "penalty_goal_pts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN "penalty_saved_pts" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN "own_goal_pts" integer DEFAULT -2 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN "handball_pts" integer DEFAULT -2 NOT NULL;--> statement-breakpoint
CREATE TABLE "match_incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "side_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "kind" "match_incident_kind" NOT NULL,
  "seq" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "match_incidents" ADD CONSTRAINT "match_incidents_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_incidents" ADD CONSTRAINT "match_incidents_side_id_match_sides_id_fk" FOREIGN KEY ("side_id") REFERENCES "public"."match_sides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_incidents" ADD CONSTRAINT "match_incidents_participant_fk" FOREIGN KEY ("match_id", "player_id") REFERENCES "public"."match_participants"("match_id", "player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_incidents_match_idx" ON "match_incidents" ("match_id");
