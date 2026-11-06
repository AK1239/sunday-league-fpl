import "dotenv/config";
import { parseEnv } from "@/env";
import { SQUAD_DISPLAY_NAMES } from "@/lib/squad";
import { getDb } from "./index";
import { seedAdminUser } from "./seed-admin";
import { players, scoringRuleSets, seasons } from "./schema";

export async function seedDatabase() {
  parseEnv(process.env);
  const db = getDb();

  const existingRules = await db.select().from(scoringRuleSets).limit(1);
  if (existingRules.length > 0) {
    console.log("Seed skipped: scoring_rule_sets already populated");
    return;
  }

  const [rules] = await db
    .insert(scoringRuleSets)
    .values({
      name: "Default · Nov 2026",
      attendancePts: 2,
      winPts: 3,
      drawPts: 1,
      goalPts: 5,
      assistPts: 3,
      mvpPts: 3,
      cleanSheetPts: 4,
    })
    .returning();

  const [season] = await db
    .insert(seasons)
    .values({
      name: "Season 1 · Nov 2026 – Jan 2027",
      startsOn: "2026-11-01",
      endsOn: "2027-01-31",
      status: "active",
      ruleSetId: rules!.id,
    })
    .returning();

  const insertedPlayers = await db
    .insert(players)
    .values(
      SQUAD_DISPLAY_NAMES.map((displayName) => ({
        displayName,
        joinedOn: "2026-11-01",
      })),
    )
    .returning();

  await seedAdminUser(db);

  console.log("Seed complete:", {
    seasonId: season!.id,
    players: insertedPlayers.length,
    note: "No gameweeks or results — schedule the first matchday in admin.",
  });
}

async function main() {
  await seedDatabase();
}

if (!process.env.VITEST) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
