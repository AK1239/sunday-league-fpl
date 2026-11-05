import { sql } from "drizzle-orm";
import { parseEnv } from "@/env";
import { getDb } from "@/server/db";
import { leagueSettings } from "@/server/db/schema";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for integration tests");
  }
  parseEnv(process.env);
  return url;
}

export async function resetDatabase() {
  const db = getDb();
  await db.execute(sql`
    truncate table
      audit_log,
      manager_rank_snapshots,
      manager_matchday_scores,
      manager_score_lines,
      fantasy_team_players,
      fantasy_teams,
      manager_invites,
      sessions,
      users,
      league_settings,
      season_awards,
      matchday_snapshots,
      point_ledger,
      matchday_attendance,
      goals,
      match_mvps,
      match_participants,
      match_sides,
      matches,
      matchdays,
      seasons,
      scoring_rule_sets,
      players
    restart identity cascade
  `);
  await db.insert(leagueSettings).values({
    timezone: "Africa/Dar_es_Salaam",
    defaultKickoffTime: "16:00:00",
    deadlineOffsetMinutes: 0,
  });
}
