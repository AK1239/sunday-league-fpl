import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import { submitTeam } from "@/server/domain/submit-team";
import {
  managerMatchdayScores,
  managerRankSnapshots,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { getManagerStandings } from "@/server/queries/manager-standings";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("recompute transfer penalty", () => {
  let managerId: string;
  let seasonId: string;
  let publishedMatchdayId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [season] = await db.select().from(seasons).limit(1);
    seasonId = season!.id;
    const [rules] = await db.select().from(scoringRuleSets).limit(1);
    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: 10 })
      .where(eq(scoringRuleSets.id, rules!.id));

    const [manager] = await db
      .insert(users)
      .values({
        email: "penalty-mgr@test.local",
        displayName: "Penalised Mgr",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const allPlayers = await db.select({ id: players.id }).from(players);
    const base = allPlayers.slice(0, 5).map((p) => p.id);
    const extras = allPlayers.slice(5, 9).map((p) => p.id);

    const [prior] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 10,
        playedOn: "2026-11-10",
        deadlineAt: new Date("2099-11-10T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    await saveFantasyTeam(
      db,
      prior!.id,
      {
        playerIds: base,
        captainPlayerId: base[0]!,
        viceCaptainPlayerId: base[1]!,
      },
      { mode: "manager", managerId },
    );

    await db
      .update(matchdays)
      .set({
        status: "published",
        publishedAt: new Date(),
        deadlineAt: new Date("2026-11-10T13:00:00.000Z"),
      })
      .where(eq(matchdays.id, prior!.id));

    const [open] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 11,
        playedOn: "2026-11-17",
        deadlineAt: new Date("2099-11-17T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    await submitTeam(
      db,
      open!.id,
      {
        playerIds: [
          extras[0]!,
          extras[1]!,
          extras[2]!,
          extras[3]!,
          base[4]!,
        ],
        captainPlayerId: extras[0]!,
        viceCaptainPlayerId: extras[1]!,
        expectedVersion: 0,
        acknowledgedPenalty: 4,
      },
      managerId,
    );

    await db
      .update(matchdays)
      .set({
        status: "published",
        publishedAt: new Date(),
        deadlineAt: new Date("2026-11-17T13:00:00.000Z"),
      })
      .where(eq(matchdays.id, open!.id));

    publishedMatchdayId = open!.id;
  });

  it("persists squad_points, transfer_penalty, and total on recompute", async () => {
    const db = getDb();
    await recomputeMatchday(publishedMatchdayId);

    const [score] = await db
      .select()
      .from(managerMatchdayScores)
      .where(eq(managerMatchdayScores.managerId, managerId));

    expect(score).toBeDefined();
    expect(score!.transferPenalty).toBe(-4);
    expect(score!.totalPoints).toBe(
      score!.squadPoints + score!.transferPenalty,
    );
  });

  it("keeps penalised managers in season rankings (D4)", async () => {
    const db = getDb();
    await recomputeMatchday(publishedMatchdayId);

    const [score] = await db
      .select()
      .from(managerMatchdayScores)
      .where(eq(managerMatchdayScores.managerId, managerId));

    expect(score!.totalPoints).toBeLessThanOrEqual(score!.squadPoints);

    const [snapshot] = await db
      .select()
      .from(managerRankSnapshots)
      .where(eq(managerRankSnapshots.managerId, managerId));

    expect(snapshot).toBeDefined();

    const standings = await getManagerStandings(db, seasonId);
    expect(standings.some((s) => s.managerId === managerId)).toBe(true);
  });
});
