ALTER TABLE "scoring_rule_sets" ADD COLUMN IF NOT EXISTS "free_transfers_per_matchday" smallint DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN IF NOT EXISTS "max_banked_free_transfers" smallint DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN IF NOT EXISTS "extra_transfer_penalty" smallint DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN IF NOT EXISTS "transfers_start_matchday" integer;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD COLUMN IF NOT EXISTS "squad_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD COLUMN IF NOT EXISTS "transfer_penalty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "manager_matchday_scores"
SET "squad_points" = "total_points",
    "transfer_penalty" = 0;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manager_matchday_scores_total_check'
  ) THEN
    ALTER TABLE "manager_matchday_scores"
      ADD CONSTRAINT "manager_matchday_scores_total_check"
      CHECK ("total_points" = "squad_points" + "transfer_penalty");
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manager_matchday_scores_transfer_penalty_non_positive'
  ) THEN
    ALTER TABLE "manager_matchday_scores"
      ADD CONSTRAINT "manager_matchday_scores_transfer_penalty_non_positive"
      CHECK ("transfer_penalty" <= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."fantasy_transfer_status" AS ENUM('active', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."fantasy_transfer_source" AS ENUM('manager', 'admin_correction');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fantasy_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"seq" smallint NOT NULL,
	"player_out_id" uuid NOT NULL,
	"player_in_id" uuid NOT NULL,
	"status" "fantasy_transfer_status" DEFAULT 'active' NOT NULL,
	"source" "fantasy_transfer_source" DEFAULT 'manager' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"voided_by" uuid,
	CONSTRAINT "fantasy_transfers_out_in_distinct" CHECK ("player_out_id" <> "player_in_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manager_transfer_windows" (
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"free_available" smallint NOT NULL,
	"unlimited" boolean DEFAULT false NOT NULL,
	"chip_code" text,
	"penalty_per_extra" smallint NOT NULL,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manager_transfer_windows_manager_id_matchday_id_pk" PRIMARY KEY("manager_id","matchday_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manager_free_transfer_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"delta" smallint NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manager_free_transfer_adjustments_delta_nonzero" CHECK ("delta" <> 0)
);--> statement-breakpoint
ALTER TABLE "fantasy_transfers" ADD CONSTRAINT "fantasy_transfers_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_transfers" ADD CONSTRAINT "fantasy_transfers_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_transfers" ADD CONSTRAINT "fantasy_transfers_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_transfers" ADD CONSTRAINT "fantasy_transfers_player_out_id_players_id_fk" FOREIGN KEY ("player_out_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_transfers" ADD CONSTRAINT "fantasy_transfers_player_in_id_players_id_fk" FOREIGN KEY ("player_in_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fantasy_transfers" ADD CONSTRAINT "fantasy_transfers_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_transfer_windows" ADD CONSTRAINT "manager_transfer_windows_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_transfer_windows" ADD CONSTRAINT "manager_transfer_windows_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_transfer_windows" ADD CONSTRAINT "manager_transfer_windows_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_free_transfer_adjustments" ADD CONSTRAINT "manager_free_transfer_adjustments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_free_transfer_adjustments" ADD CONSTRAINT "manager_free_transfer_adjustments_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_free_transfer_adjustments" ADD CONSTRAINT "manager_free_transfer_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fantasy_transfers_manager_matchday_out_active" ON "fantasy_transfers" ("manager_id","matchday_id","player_out_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fantasy_transfers_manager_matchday_in_active" ON "fantasy_transfers" ("manager_id","matchday_id","player_in_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fantasy_transfers_manager_matchday_seq_active" ON "fantasy_transfers" ("manager_id","matchday_id","seq") WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fantasy_transfers_matchday_idx" ON "fantasy_transfers" ("matchday_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_transfer_windows_season_idx" ON "manager_transfer_windows" ("season_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_free_transfer_adjustments_matchday_idx" ON "manager_free_transfer_adjustments" ("matchday_id");--> statement-breakpoint
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
DROP TRIGGER IF EXISTS fantasy_team_players_count_check ON fantasy_team_players;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER fantasy_team_players_count_check
AFTER INSERT OR UPDATE OR DELETE ON fantasy_team_players
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_fantasy_team_player_count();
