-- Optional manager team name, shown in public tables instead of the personal name.
ALTER TABLE "users" ADD COLUMN "team_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_team_name_lower_unique" ON "users" (lower("team_name")) WHERE "team_name" IS NOT NULL;
