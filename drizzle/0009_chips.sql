DO $$
BEGIN
  CREATE TYPE "public"."fantasy_squad_kind" AS ENUM('permanent', 'free_hit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."manager_chip_play_status" AS ENUM('active', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."manager_chip_play_source" AS ENUM('manager', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TYPE "public"."manager_score_line_role" ADD VALUE IF NOT EXISTS 'reserve';--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD COLUMN IF NOT EXISTS "squad_kind" "fantasy_squad_kind" DEFAULT 'permanent' NOT NULL;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD COLUMN IF NOT EXISTS "reserve_player_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fantasy_teams_reserve_not_captain'
  ) THEN
    ALTER TABLE "fantasy_teams"
      ADD CONSTRAINT "fantasy_teams_reserve_not_captain"
      CHECK (
        "reserve_player_id" IS NULL
        OR (
          "reserve_player_id" <> "captain_player_id"
          AND "reserve_player_id" <> "vice_captain_player_id"
        )
      );
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_reserve_player_id_players_id_fk" FOREIGN KEY ("reserve_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "season_chips" (
	"season_id" uuid NOT NULL,
	"chip_code" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"available_from_matchday" integer DEFAULT 1 NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_chips_season_id_chip_code_pk" PRIMARY KEY("season_id","chip_code")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manager_chip_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"chip_code" text NOT NULL,
	"status" "manager_chip_play_status" DEFAULT 'active' NOT NULL,
	"source" "manager_chip_play_source" DEFAULT 'manager' NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"voided_by" uuid,
	CONSTRAINT "manager_chip_plays_void_fields_check" CHECK (
		("status" = 'active' AND "voided_at" IS NULL)
		OR (
			"status" = 'void'
			AND "voided_at" IS NOT NULL
			AND "void_reason" IS NOT NULL
		)
	)
);--> statement-breakpoint
ALTER TABLE "season_chips" ADD CONSTRAINT "season_chips_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_chip_plays" ADD CONSTRAINT "manager_chip_plays_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_chip_plays" ADD CONSTRAINT "manager_chip_plays_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_chip_plays" ADD CONSTRAINT "manager_chip_plays_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_chip_plays" ADD CONSTRAINT "manager_chip_plays_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_chip_plays" ADD CONSTRAINT "manager_chip_plays_season_chip_fk" FOREIGN KEY ("season_id", "chip_code") REFERENCES "public"."season_chips"("season_id","chip_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "manager_chip_plays_one_active_per_matchday" ON "manager_chip_plays" ("manager_id", "matchday_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "manager_chip_plays_one_active_per_chip_per_season" ON "manager_chip_plays" ("manager_id", "season_id", "chip_code") WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_chip_plays_matchday_idx" ON "manager_chip_plays" ("matchday_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_chip_plays_season_manager_idx" ON "manager_chip_plays" ("season_id", "manager_id");--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD COLUMN IF NOT EXISTS "chip_code" text;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD COLUMN IF NOT EXISTS "chip_bonus" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_fantasy_team_reserve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_bench_boost boolean;
BEGIN
  IF NEW.reserve_player_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM fantasy_team_players ftp
    WHERE ftp.fantasy_team_id = NEW.id
      AND ftp.player_id = NEW.reserve_player_id
  ) THEN
    RAISE EXCEPTION 'reserve_player_id cannot be one of the starting five';
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
    RAISE EXCEPTION 'reserve_player_id requires an active bench_boost chip play';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS fantasy_teams_reserve_check ON fantasy_teams;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fantasy_teams_reserve_check
  AFTER INSERT OR UPDATE OF reserve_player_id ON fantasy_teams
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION enforce_fantasy_team_reserve();
