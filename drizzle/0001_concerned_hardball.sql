CREATE TYPE "public"."match_side" AS ENUM('A', 'B');--> statement-breakpoint
CREATE TYPE "public"."matchday_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."point_kind" AS ENUM('attendance', 'win', 'draw', 'goal', 'assist', 'mvp', 'clean_sheet');--> statement-breakpoint
CREATE TYPE "public"."season_award" AS ENUM('champion', 'golden_boot', 'playmaker', 'most_appearances', 'most_wins');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('upcoming', 'active', 'closed');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"side_id" uuid NOT NULL,
	"scorer_id" uuid NOT NULL,
	"assist_id" uuid,
	"seq" integer NOT NULL,
	CONSTRAINT "goals_scorer_assist_distinct" CHECK ("goals"."assist_id" IS NULL OR "goals"."scorer_id" <> "goals"."assist_id")
);
--> statement-breakpoint
CREATE TABLE "match_mvps" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"side_id" uuid NOT NULL,
	CONSTRAINT "match_participants_match_id_player_id_pk" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "match_sides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"side" "match_side" NOT NULL,
	"goalkeeper_player_id" uuid
);
--> statement-breakpoint
CREATE TABLE "matchday_attendance" (
	"matchday_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "matchday_attendance_matchday_id_player_id_pk" PRIMARY KEY("matchday_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "matchday_snapshots" (
	"matchday_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"rank_after" integer NOT NULL,
	"points_after" integer NOT NULL,
	CONSTRAINT "matchday_snapshots_matchday_id_player_id_pk" PRIMARY KEY("matchday_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "matchdays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"played_on" date NOT NULL,
	"status" "matchday_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matchday_id" uuid NOT NULL,
	"match_no" integer NOT NULL,
	"score_a" integer NOT NULL,
	"score_b" integer NOT NULL,
	CONSTRAINT "matches_score_a_nonneg" CHECK ("matches"."score_a" >= 0),
	CONSTRAINT "matches_score_b_nonneg" CHECK ("matches"."score_b" >= 0)
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"nickname" text,
	"avatar_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"joined_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"matchday_id" uuid NOT NULL,
	"match_id" uuid,
	"player_id" uuid NOT NULL,
	"kind" "point_kind" NOT NULL,
	"points" integer NOT NULL,
	"source_ref" uuid,
	"rule_set_id" uuid NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_rule_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"attendance_pts" integer NOT NULL,
	"win_pts" integer NOT NULL,
	"draw_pts" integer NOT NULL,
	"goal_pts" integer NOT NULL,
	"assist_pts" integer NOT NULL,
	"mvp_pts" integer NOT NULL,
	"clean_sheet_pts" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"award" "season_award" NOT NULL,
	"player_id" uuid NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" "season_status" DEFAULT 'upcoming' NOT NULL,
	"rule_set_id" uuid NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "seasons_dates_check" CHECK ("seasons"."ends_on" > "seasons"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_side_id_match_sides_id_fk" FOREIGN KEY ("side_id") REFERENCES "public"."match_sides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_match_id_scorer_id_match_participants_match_id_player_id_fk" FOREIGN KEY ("match_id","scorer_id") REFERENCES "public"."match_participants"("match_id","player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_mvps" ADD CONSTRAINT "match_mvps_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_mvps" ADD CONSTRAINT "match_mvps_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_side_id_match_sides_id_fk" FOREIGN KEY ("side_id") REFERENCES "public"."match_sides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_sides" ADD CONSTRAINT "match_sides_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_sides" ADD CONSTRAINT "match_sides_goalkeeper_player_id_players_id_fk" FOREIGN KEY ("goalkeeper_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_attendance" ADD CONSTRAINT "matchday_attendance_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_attendance" ADD CONSTRAINT "matchday_attendance_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_snapshots" ADD CONSTRAINT "matchday_snapshots_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_snapshots" ADD CONSTRAINT "matchday_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_rule_set_id_scoring_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."scoring_rule_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_rule_set_id_scoring_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."scoring_rule_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_match_idx" ON "goals" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_participants_player_idx" ON "match_participants" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_sides_match_side_unique" ON "match_sides" USING btree ("match_id","side");--> statement-breakpoint
CREATE INDEX "matchday_snapshots_matchday_idx" ON "matchday_snapshots" USING btree ("matchday_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matchdays_season_number_unique" ON "matchdays" USING btree ("season_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "matchdays_season_played_on_unique" ON "matchdays" USING btree ("season_id","played_on");--> statement-breakpoint
CREATE INDEX "matchdays_season_status_idx" ON "matchdays" USING btree ("season_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_matchday_match_no_unique" ON "matches" USING btree ("matchday_id","match_no");--> statement-breakpoint
CREATE INDEX "matches_matchday_idx" ON "matches" USING btree ("matchday_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_display_name_lower_unique" ON "players" USING btree (lower("display_name"));--> statement-breakpoint
CREATE INDEX "point_ledger_season_player_idx" ON "point_ledger" USING btree ("season_id","player_id");--> statement-breakpoint
CREATE INDEX "point_ledger_matchday_idx" ON "point_ledger" USING btree ("matchday_id");--> statement-breakpoint
CREATE INDEX "seasons_status_idx" ON "seasons" USING btree ("status");