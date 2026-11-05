CREATE TYPE "public"."manager_score_line_role" AS ENUM('player', 'captain', 'vice_captain');--> statement-breakpoint
CREATE TYPE "public"."manager_matchday_team_source" AS ENUM('manual', 'carry_over', 'admin', 'none');--> statement-breakpoint
CREATE TABLE "manager_score_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"role" "manager_score_line_role" NOT NULL,
	"base_points" integer NOT NULL,
	"multiplier" integer NOT NULL,
	"points" integer NOT NULL,
	"attended" boolean NOT NULL,
	"team_source" "manager_matchday_team_source" NOT NULL
);--> statement-breakpoint
CREATE TABLE "manager_matchday_scores" (
	"manager_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"total_points" integer NOT NULL,
	"multiplier_player_id" uuid,
	"team_source" "manager_matchday_team_source" NOT NULL,
	CONSTRAINT "manager_matchday_scores_manager_id_matchday_id_pk" PRIMARY KEY("manager_id","matchday_id")
);--> statement-breakpoint
CREATE TABLE "manager_rank_snapshots" (
	"matchday_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"rank_after" integer NOT NULL,
	"points_after" integer NOT NULL,
	CONSTRAINT "manager_rank_snapshots_matchday_id_manager_id_pk" PRIMARY KEY("matchday_id","manager_id")
);--> statement-breakpoint
ALTER TABLE "manager_score_lines" ADD CONSTRAINT "manager_score_lines_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_score_lines" ADD CONSTRAINT "manager_score_lines_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_score_lines" ADD CONSTRAINT "manager_score_lines_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_score_lines" ADD CONSTRAINT "manager_score_lines_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD CONSTRAINT "manager_matchday_scores_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD CONSTRAINT "manager_matchday_scores_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD CONSTRAINT "manager_matchday_scores_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_matchday_scores" ADD CONSTRAINT "manager_matchday_scores_multiplier_player_id_players_id_fk" FOREIGN KEY ("multiplier_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_rank_snapshots" ADD CONSTRAINT "manager_rank_snapshots_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_rank_snapshots" ADD CONSTRAINT "manager_rank_snapshots_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "manager_score_lines_manager_matchday_player_unique" ON "manager_score_lines" USING btree ("manager_id","matchday_id","player_id");--> statement-breakpoint
CREATE INDEX "manager_score_lines_matchday_idx" ON "manager_score_lines" USING btree ("matchday_id");--> statement-breakpoint
CREATE INDEX "manager_matchday_scores_season_idx" ON "manager_matchday_scores" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "manager_rank_snapshots_matchday_idx" ON "manager_rank_snapshots" USING btree ("matchday_id");
