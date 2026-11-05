ALTER TABLE "scoring_rule_sets" ADD COLUMN IF NOT EXISTS "captain_multiplier" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "matchdays" ADD COLUMN IF NOT EXISTS "deadline_at" timestamp with time zone;--> statement-breakpoint
UPDATE "matchdays"
SET "deadline_at" = (("played_on" + time '16:00') AT TIME ZONE 'Africa/Dar_es_Salaam')
WHERE "deadline_at" IS NULL;--> statement-breakpoint
ALTER TABLE "matchdays" ALTER COLUMN "deadline_at" SET NOT NULL;--> statement-breakpoint
CREATE TYPE "public"."fantasy_team_source" AS ENUM('manual', 'carry_over', 'admin');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" text DEFAULT 'Africa/Dar_es_Salaam' NOT NULL,
	"default_kickoff_time" time DEFAULT '16:00:00' NOT NULL,
	"deadline_offset_minutes" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
INSERT INTO "league_settings" ("timezone", "default_kickoff_time", "deadline_offset_minutes")
SELECT 'Africa/Dar_es_Salaam', '16:00:00', 0
WHERE NOT EXISTS (SELECT 1 FROM "league_settings");--> statement-breakpoint
CREATE TABLE "fantasy_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"captain_player_id" uuid NOT NULL,
	"vice_captain_player_id" uuid NOT NULL,
	"source" "fantasy_team_source" DEFAULT 'manual' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "fantasy_teams_captain_vice_distinct" CHECK ("captain_player_id" <> "vice_captain_player_id")
);--> statement-breakpoint
CREATE TABLE "fantasy_team_players" (
	"fantasy_team_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "fantasy_team_players_fantasy_team_id_player_id_pk" PRIMARY KEY("fantasy_team_id","player_id")
);--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_captain_player_id_players_id_fk" FOREIGN KEY ("captain_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_vice_captain_player_id_players_id_fk" FOREIGN KEY ("vice_captain_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_team_players" ADD CONSTRAINT "fantasy_team_players_fantasy_team_id_fantasy_teams_id_fk" FOREIGN KEY ("fantasy_team_id") REFERENCES "public"."fantasy_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_team_players" ADD CONSTRAINT "fantasy_team_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fantasy_teams_manager_matchday_unique" ON "fantasy_teams" USING btree ("manager_id","matchday_id");--> statement-breakpoint
CREATE INDEX "fantasy_teams_matchday_idx" ON "fantasy_teams" USING btree ("matchday_id");--> statement-breakpoint
CREATE INDEX "fantasy_team_players_player_idx" ON "fantasy_team_players" USING btree ("player_id");--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_captain_in_squad_fk" FOREIGN KEY ("id", "captain_player_id") REFERENCES "public"."fantasy_team_players"("fantasy_team_id", "player_id") DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_vice_in_squad_fk" FOREIGN KEY ("id", "vice_captain_player_id") REFERENCES "public"."fantasy_team_players"("fantasy_team_id", "player_id") DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_fantasy_team_player_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_team_id uuid;
  player_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_team_id := OLD.fantasy_team_id;
  ELSE
    affected_team_id := NEW.fantasy_team_id;
  END IF;

  IF EXISTS (SELECT 1 FROM fantasy_teams WHERE id = affected_team_id) THEN
    SELECT COUNT(*) INTO player_count
    FROM fantasy_team_players
    WHERE fantasy_team_id = affected_team_id;

    IF player_count <> 5 THEN
      RAISE EXCEPTION 'fantasy team % must have exactly 5 players (found %)', affected_team_id, player_count;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fantasy_team_players_count_check
AFTER INSERT OR UPDATE OR DELETE ON fantasy_team_players
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_fantasy_team_player_count();
