/**
 * Optional E2E fixture: enable transfers and seed two gameweeks for the CI admin user.
 * Run with E2E_TRANSFERS=1 before transfer E2E tests.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import {
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";

async function main() {
  const db = getDb();
  const email = (process.env.ADMIN_EMAIL ?? "ci@mkate.test").toLowerCase();

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    console.error("Admin user not found — run pnpm db:seed-admin first");
    process.exit(1);
  }

  const [season] = await db
    .select({ id: seasons.id, ruleSetId: seasons.ruleSetId })
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  if (!season) {
    console.error("No active season");
    process.exit(1);
  }

  await db
    .update(scoringRuleSets)
    .set({ transfersStartMatchday: 1 })
    .where(eq(scoringRuleSets.id, season.ruleSetId));

  const existing = await db
    .select({ id: matchdays.id })
    .from(matchdays)
    .where(eq(matchdays.seasonId, season.id))
    .limit(1);
  if (existing.length > 0) {
    console.log("Matchdays already exist — skipping GW insert");
    return;
  }

  const playerIds = (
    await db.select({ id: players.id }).from(players).limit(5)
  ).map((p) => p.id);
  if (playerIds.length < 5) {
    console.error("Need at least 5 players");
    process.exit(1);
  }

  const [gw1] = await db
    .insert(matchdays)
    .values({
      seasonId: season.id,
      number: 1,
      playedOn: "2099-01-05",
      deadlineAt: new Date("2099-01-05T10:00:00.000Z"),
      status: "scheduled",
    })
    .returning();

  await saveFantasyTeam(
    db,
    gw1!.id,
    {
      playerIds,
      captainPlayerId: playerIds[0]!,
      viceCaptainPlayerId: playerIds[1]!,
    },
    { mode: "manager", managerId: user.id },
  );

  await db.insert(matchdays).values({
    seasonId: season.id,
    number: 2,
    playedOn: "2099-01-12",
    deadlineAt: new Date("2099-01-12T10:00:00.000Z"),
    status: "scheduled",
  });

  console.log("E2E transfers fixture ready (transfers from GW1, open GW2)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
