import { expect } from "vitest";
import { sql } from "drizzle-orm";
import { parseEnv } from "@/env";
import { getDb } from "@/server/db";
import { leagueSettings } from "@/server/db/schema";
import { isTestDatabaseUrl, readDevDatabaseUrl } from "../test-database";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for integration tests");
  }
  if (process.env.FANTASY_INTEGRATION_TEST_DB !== "1") {
    throw new Error(
      "Integration tests must run via vitest setup (isolated test database).",
    );
  }
  if (!isTestDatabaseUrl(url)) {
    throw new Error(
      `Refusing to run integration tests on non-test database. Dev DB is ${readDevDatabaseUrl()}.`,
    );
  }
  parseEnv(process.env);
  return url;
}

function assertSafeToTruncate(): void {
  requireDatabaseUrl();
}

/** Drizzle often wraps deferred constraint failures as a failed COMMIT. */
export function dbErrorMessage(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" ");
}

export async function expectDbReject(
  run: () => Promise<unknown>,
  pattern: RegExp,
) {
  try {
    await run();
    throw new Error("Expected promise to reject");
  } catch (error) {
    if (error instanceof Error && error.message === "Expected promise to reject") {
      throw error;
    }
    expect(dbErrorMessage(error)).toMatch(pattern);
  }
}

export async function resetDatabase() {
  assertSafeToTruncate();
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
