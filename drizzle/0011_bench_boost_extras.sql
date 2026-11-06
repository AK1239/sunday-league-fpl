-- Bench Boost now adds TWO extra players (was one "reserve").
ALTER TABLE "fantasy_teams" ADD COLUMN IF NOT EXISTS "reserve_player_id_2" uuid;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_reserve_player_id_2_players_id_fk" FOREIGN KEY ("reserve_player_id_2") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_reserve2_valid" CHECK (
  "reserve_player_id_2" IS NULL
  OR (
    "reserve_player_id" IS NOT NULL
    AND "reserve_player_id_2" <> "reserve_player_id"
    AND "reserve_player_id_2" <> "captain_player_id"
    AND "reserve_player_id_2" <> "vice_captain_player_id"
  )
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_fantasy_team_reserve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_bench_boost boolean;
BEGIN
  IF NEW.reserve_player_id IS NULL AND NEW.reserve_player_id_2 IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM fantasy_team_players ftp
    WHERE ftp.fantasy_team_id = NEW.id
      AND ftp.player_id IN (NEW.reserve_player_id, NEW.reserve_player_id_2)
  ) THEN
    RAISE EXCEPTION 'extra players cannot be one of the starting five';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM manager_chip_plays mcp
    WHERE mcp.manager_id = NEW.manager_id
      AND mcp.matchday_id = NEW.matchday_id
      AND mcp.chip_code = 'bench_boost'
      AND mcp.status = 'active'
  ) INTO has_bench_boost;

  IF NOT has_bench_boost THEN
    RAISE EXCEPTION 'extra players require an active bench_boost chip play';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS fantasy_teams_reserve_check ON fantasy_teams;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fantasy_teams_reserve_check
  AFTER INSERT OR UPDATE OF reserve_player_id, reserve_player_id_2 ON fantasy_teams
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION enforce_fantasy_team_reserve();
