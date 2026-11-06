import { describe, expect, it, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  managerChipPlays,
  matchdays,
  players,
  scoringRuleSets,
  seasonChips,
  seasons,
  users,
} from "@/server/db/schema";
import { expectDbReject, resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

async function seedFixtures() {
  const db = getDb();
  const [rules] = await db
    .insert(scoringRuleSets)
    .values({
      name: "Chips rules",
      attendancePts: 2,
      winPts: 3,
      drawPts: 1,
      goalPts: 5,
      assistPts: 3,
      mvpPts: 3,
      cleanSheetPts: 4,
      captainMultiplier: 2,
    })
    .returning();
  const [season] = await db
    .insert(seasons)
    .values({
      name: "Chips season",
      startsOn: "2026-11-01",
      endsOn: "2027-01-31",
      status: "active",
      ruleSetId: rules!.id,
    })
    .returning();
  await db.insert(seasonChips).values({
    seasonId: season!.id,
    chipCode: "bench_boost",
    enabled: true,
  });
  const [matchday] = await db
    .insert(matchdays)
    .values({
      seasonId: season!.id,
      number: 1,
      playedOn: "2026-11-02",
      deadlineAt: new Date("2026-11-02T13:00:00.000Z"),
      status: "scheduled",
    })
    .returning();
  const squad = await db
    .insert(players)
    .values([
      { displayName: "A" },
      { displayName: "B" },
      { displayName: "C" },
      { displayName: "D" },
      { displayName: "E" },
      { displayName: "F" },
    ])
    .returning();
  const [manager] = await db
    .insert(users)
    .values({
      email: "chips@test.local",
      displayName: "Chips Mgr",
      passwordHash: "x",
      role: "manager",
      status: "active",
    })
    .returning();

  return {
    seasonId: season!.id,
    matchdayId: matchday!.id,
    managerId: manager!.id,
    playerIds: squad.map((p) => p.id),
  };
}

async function insertTeamWithFive(
  fx: Awaited<ReturnType<typeof seedFixtures>>,
  reservePlayerId?: string | null,
) {
  const [p1, p2, p3, p4, p5] = fx.playerIds;
  return getDb().transaction(async (tx) => {
    const [team] = await tx
      .insert(fantasyTeams)
      .values({
        managerId: fx.managerId,
        matchdayId: fx.matchdayId,
        captainPlayerId: p1!,
        viceCaptainPlayerId: p2!,
        squadKind: "permanent",
        reservePlayerId: reservePlayerId ?? null,
      })
      .returning();
    await tx.insert(fantasyTeamPlayers).values(
      [p1, p2, p3, p4, p5].map((playerId) => ({
        fantasyTeamId: team!.id,
        playerId: playerId!,
      })),
    );
    return team!;
  });
}

describe.skipIf(!hasDatabase)("chips schema (0009)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("defaults squad_kind and chip_bonus columns", async () => {
    const fx = await seedFixtures();
    await insertTeamWithFive(fx);
    const teamRow = await getDb()
      .select({ squadKind: fantasyTeams.squadKind })
      .from(fantasyTeams)
      .where(eq(fantasyTeams.managerId, fx.managerId));
    expect(teamRow[0]?.squadKind).toBe("permanent");

    const bonus = await getDb().execute<{ column_default: string | null }>(sql`
      select column_default
      from information_schema.columns
      where table_name = 'manager_matchday_scores'
        and column_name = 'chip_bonus'
    `);
    expect(String(bonus.rows[0]?.column_default ?? "")).toMatch(/0/);
  });

  it("allows one active chip play per manager and matchday", async () => {
    const fx = await seedFixtures();
    await getDb()
      .insert(managerChipPlays)
      .values({
        seasonId: fx.seasonId,
        managerId: fx.managerId,
        matchdayId: fx.matchdayId,
        chipCode: "bench_boost",
      });
    await expectDbReject(
      () =>
        getDb().insert(managerChipPlays).values({
          seasonId: fx.seasonId,
          managerId: fx.managerId,
          matchdayId: fx.matchdayId,
          chipCode: "bench_boost",
        }),
      /unique|duplicate/i,
    );
  });

  it("requires bench_boost play when reserve_player_id is set", async () => {
    const fx = await seedFixtures();
    const reserveId = fx.playerIds[5]!;
    await expectDbReject(
      () => insertTeamWithFive(fx, reserveId),
      /bench_boost/i,
    );
  });

  it("rejects reserve among the starting five", async () => {
    const fx = await seedFixtures();
    const reserveId = fx.playerIds[0]!;
    await expectDbReject(
      () =>
        getDb().transaction(async (tx) => {
          await tx.insert(managerChipPlays).values({
            seasonId: fx.seasonId,
            managerId: fx.managerId,
            matchdayId: fx.matchdayId,
            chipCode: "bench_boost",
          });
          const [team] = await tx
            .insert(fantasyTeams)
            .values({
              managerId: fx.managerId,
              matchdayId: fx.matchdayId,
              captainPlayerId: fx.playerIds[1]!,
              viceCaptainPlayerId: fx.playerIds[2]!,
              reservePlayerId: reserveId,
            })
            .returning();
          await tx.insert(fantasyTeamPlayers).values(
            fx.playerIds.slice(0, 5).map((playerId) => ({
              fantasyTeamId: team!.id,
              playerId,
            })),
          );
        }),
      /starting five/i,
    );
  });

  it("commits reserve when bench_boost is active and reserve is outside the five", async () => {
    const fx = await seedFixtures();
    const reserveId = fx.playerIds[5]!;
    await getDb().transaction(async (tx) => {
      await tx.insert(managerChipPlays).values({
        seasonId: fx.seasonId,
        managerId: fx.managerId,
        matchdayId: fx.matchdayId,
        chipCode: "bench_boost",
      });
      const [team] = await tx
        .insert(fantasyTeams)
        .values({
          managerId: fx.managerId,
          matchdayId: fx.matchdayId,
          captainPlayerId: fx.playerIds[0]!,
          viceCaptainPlayerId: fx.playerIds[1]!,
          reservePlayerId: reserveId,
        })
        .returning();
      await tx.insert(fantasyTeamPlayers).values(
        fx.playerIds.slice(0, 5).map((playerId) => ({
          fantasyTeamId: team!.id,
          playerId,
        })),
      );
    });
    const row = await getDb()
      .select({ reserve: fantasyTeams.reservePlayerId })
      .from(fantasyTeams)
      .where(eq(fantasyTeams.managerId, fx.managerId));
    expect(row[0]?.reserve).toBe(reserveId);
  });
});
