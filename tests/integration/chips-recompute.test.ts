import { describe, expect, it, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  managerChipPlays,
  managerMatchdayScores,
  managerScoreLines,
  matchdayAttendance,
  players,
  seasonChips,
  users,
} from "@/server/db/schema";
import { getActiveSeasonId, seedPublishedDemoMatchday } from "./seed-fixture";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

async function seedChipScorerTeam(options: {
  matchdayId: string;
  seasonId: string;
  reserveIds?: string[];
  benchBoostPlay?: boolean;
}) {
  const db = getDb();
  const byName = new Map(
    (await db.select().from(players)).map((p) => [p.displayName, p]),
  );
  const akil = byName.get("Akil")!;
  const murti = byName.get("Murti")!;
  const pickIds = ["Akil", "Murti", "Yusuf", "Lolo", "Ajam"].map(
    (name) => byName.get(name)!.id,
  );

  const [manager] = await db
    .insert(users)
    .values({
      email: `chips-score-${Math.random().toString(36).slice(2)}@test.local`,
      displayName: "Chip Scorer",
      passwordHash: "x",
      role: "manager",
      status: "active",
    })
    .returning();

  await db.insert(seasonChips).values([
    { seasonId: options.seasonId, chipCode: "triple_captain", enabled: true },
    { seasonId: options.seasonId, chipCode: "bench_boost", enabled: true },
  ]);

  await db.transaction(async (tx) => {
    if (options.benchBoostPlay) {
      await tx.insert(managerChipPlays).values({
        seasonId: options.seasonId,
        managerId: manager!.id,
        matchdayId: options.matchdayId,
        chipCode: "bench_boost",
        params: {},
      });
    }

    const [team] = await tx
      .insert(fantasyTeams)
      .values({
        managerId: manager!.id,
        matchdayId: options.matchdayId,
        captainPlayerId: akil.id,
        viceCaptainPlayerId: murti.id,
        source: "manual",
        reservePlayerId: options.reserveIds?.[0] ?? null,
        reservePlayerId2: options.reserveIds?.[1] ?? null,
      })
      .returning();
    await tx.insert(fantasyTeamPlayers).values(
      pickIds.map((playerId) => ({
        fantasyTeamId: team!.id,
        playerId,
      })),
    );
  });

  return { managerId: manager!.id, byName };
}

describe.skipIf(!hasDatabase)("chips recompute (phase 4)", () => {
  let matchdayId: string;
  let seasonId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    seasonId = await getActiveSeasonId(db);
    matchdayId = await seedPublishedDemoMatchday(db, seasonId);
  });

  it("persists triple captain multiplier and chip_bonus on recompute", async () => {
    const db = getDb();
    const { managerId } = await seedChipScorerTeam({
      matchdayId,
      seasonId,
    });

    await db.insert(managerChipPlays).values({
      seasonId,
      managerId,
      matchdayId,
      chipCode: "triple_captain",
      params: { multiplier: 3 },
    });

    await recomputeMatchday(matchdayId);

    const [total] = await db
      .select()
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, matchdayId),
        ),
      );

    expect(total?.chipCode).toBe("triple_captain");
    expect(total!.chipBonus).toBeGreaterThan(0);

    const captainLine = await db
      .select()
      .from(managerScoreLines)
      .where(
        and(
          eq(managerScoreLines.managerId, managerId),
          eq(managerScoreLines.matchdayId, matchdayId),
          eq(managerScoreLines.role, "captain"),
        ),
      );

    expect(captainLine[0]?.multiplier).toBe(3);
    expect(captainLine[0]!.points).toBe(captainLine[0]!.basePoints * 3);
  });

  it("persists both bench boost extra lines and chip_bonus", async () => {
    const db = getDb();
    const all = await db.select().from(players);
    const extraA = all.find((p) => p.displayName === "Chapati")!;
    const extraB = all.find((p) => p.displayName === "Ali")!;

    const { managerId } = await seedChipScorerTeam({
      matchdayId,
      seasonId,
      reserveIds: [extraA.id, extraB.id],
      benchBoostPlay: true,
    });

    await db.insert(matchdayAttendance).values([
      { matchdayId, playerId: extraA.id },
      { matchdayId, playerId: extraB.id },
    ]);

    await recomputeMatchday(matchdayId);

    const [total] = await db
      .select()
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, matchdayId),
        ),
      );

    expect(total?.chipCode).toBe("bench_boost");

    const extraLines = await db
      .select()
      .from(managerScoreLines)
      .where(
        and(
          eq(managerScoreLines.managerId, managerId),
          eq(managerScoreLines.matchdayId, matchdayId),
          eq(managerScoreLines.role, "reserve"),
        ),
      );

    expect(extraLines).toHaveLength(2);
    expect(extraLines.map((l) => l.playerId).sort()).toEqual(
      [extraA.id, extraB.id].sort(),
    );
  });
});
