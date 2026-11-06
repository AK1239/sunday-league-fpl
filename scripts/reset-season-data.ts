/**
 * Wipes all season / gameweek / match / scoring / fantasy data and creates one fresh "Season 1".
 *
 * KEEPS: players, users, sessions, manager_invites, scoring_rule_sets, league_settings, audit_log (activity history)
 *
 * Usage:
 *   CONFIRM_RESET_SEASON=YES pnpm db:reset-season
 *
 * Production (extra guard):
 *   CONFIRM_RESET_SEASON=YES FORCE_PRODUCTION_RESET=YES pnpm db:reset-season
 *
 * Optional overrides:
 *   SEASON_NAME="Season 1 · Nov 2026 – Jan 2027"
 *   SEASON_STARTS_ON=2026-11-01
 *   SEASON_ENDS_ON=2027-01-31
 */
import "dotenv/config";
import { asc, sql } from "drizzle-orm";
import { parseEnv } from "@/env";
import { scoringRuleSets, seasons } from "@/server/db/schema";
import { getDb, resetDbConnection } from "@/server/db";

const CONFIRM = process.env.CONFIRM_RESET_SEASON === "YES";

function assertSafeToRun() {
  if (!CONFIRM) {
    console.error(
      "Refusing to run: set CONFIRM_RESET_SEASON=YES (this destroys all seasons, matchdays, matches, scores, fantasy picks, transfers, chips usage, etc.)",
    );
    process.exit(1);
  }
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production" && process.env.FORCE_PRODUCTION_RESET !== "YES") {
    console.error(
      "Refusing to run in NODE_ENV=production without FORCE_PRODUCTION_RESET=YES",
    );
    process.exit(1);
  }
}

async function main() {
  assertSafeToRun();
  parseEnv(process.env);

  const db = getDb();

  const [ruleSet] = await db
    .select({ id: scoringRuleSets.id })
    .from(scoringRuleSets)
    .orderBy(asc(scoringRuleSets.createdAt))
    .limit(1);
  const ruleSetId = ruleSet?.id;
  if (!ruleSetId) {
    console.error(
      "No scoring_rule_sets row found. Run `pnpm db:seed` first, then retry.",
    );
    process.exit(1);
  }

  const seasonName =
    process.env.SEASON_NAME ?? "Season 1 · Nov 2026 – Jan 2027";
  const startsOn = process.env.SEASON_STARTS_ON ?? "2026-11-01";
  const endsOn = process.env.SEASON_ENDS_ON ?? "2027-01-31";

  await db.transaction(async (tx) => {
    // Cascades to matchdays, matches, goals, fantasy_teams, transfers, scores, chips, etc.
    await tx.execute(sql`truncate table seasons cascade`);

    await tx.insert(seasons).values({
      name: seasonName,
      startsOn,
      endsOn,
      status: "active",
      ruleSetId,
    });
  });

  resetDbConnection();

  console.log("Reset complete.");
  console.log(`  New season: ${seasonName} (${startsOn} → ${endsOn}), active`);
  console.log("  Gameweeks: load home or pick (auto-schedule) or create in Admin.");
  console.log("  Users, sessions, players, and scoring rules were kept.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
