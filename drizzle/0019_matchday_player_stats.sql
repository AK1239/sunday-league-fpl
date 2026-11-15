CREATE TABLE IF NOT EXISTS "matchday_player_stats" (
	"matchday_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"penalty_goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"penalties_missed" integer DEFAULT 0 NOT NULL,
	"penalties_saved" integer DEFAULT 0 NOT NULL,
	"own_goals" integer DEFAULT 0 NOT NULL,
	"handballs" integer DEFAULT 0 NOT NULL,
	"clean_sheets" integer DEFAULT 0 NOT NULL,
	"hat_tricks" integer DEFAULT 0 NOT NULL,
	"mvps" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "matchday_player_stats_matchday_id_player_id_pk" PRIMARY KEY("matchday_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "matchday_player_stats" ADD CONSTRAINT "matchday_player_stats_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_player_stats" ADD CONSTRAINT "matchday_player_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
