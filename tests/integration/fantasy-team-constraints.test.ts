import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

async function seedFixtures() {
  const db = getDb();
  const [rules] = await db
    .insert(scoringRuleSets)
    .values({
      name: "Test rules",
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
      name: "Test season",
      startsOn: "2026-11-01",
      endsOn: "2027-01-31",
      status: "active",
      ruleSetId: rules!.id,
    })
    .returning();
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
      email: "mgr@test.local",
      displayName: "Mgr",
      passwordHash: "x",
      role: "manager",
      status: "active",
    })
    .returning();

  return {
    matchdayId: matchday!.id,
    managerId: manager!.id,
    playerIds: squad.map((p) => p.id),
  };
}

async function insertValidTeam(input: {
  managerId: string;
  matchdayId: string;
  playerIds: string[];
}) {
  const [p1, p2, p3, p4, p5] = input.playerIds;
  return getDb().transaction(async (tx) => {
    const [team] = await tx
      .insert(fantasyTeams)
      .values({
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        captainPlayerId: p1!,
        viceCaptainPlayerId: p2!,
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

describe.skipIf(!hasDatabase)("fantasy team DB constraints", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("commits a team with exactly five players", async () => {
    const fx = await seedFixtures();
    const team = await insertValidTeam({
      managerId: fx.managerId,
      matchdayId: fx.matchdayId,
      playerIds: fx.playerIds.slice(0, 5),
    });
    const rows = await getDb()
      .select()
      .from(fantasyTeamPlayers)
      .where(eq(fantasyTeamPlayers.fantasyTeamId, team.id));
    expect(rows).toHaveLength(5);
  });

  it("rejects fewer than five players at commit", async () => {
    const fx = await seedFixtures();
    const ids = fx.playerIds.slice(0, 5);
    await expect(
      getDb().transaction(async (tx) => {
        const [team] = await tx
          .insert(fantasyTeams)
          .values({
            managerId: fx.managerId,
            matchdayId: fx.matchdayId,
            captainPlayerId: ids[0]!,
            viceCaptainPlayerId: ids[1]!,
          })
          .returning();
        await tx.insert(fantasyTeamPlayers).values(
          ids.slice(0, 3).map((playerId) => ({
            fantasyTeamId: team!.id,
            playerId,
          })),
        );
      }),
    ).rejects.toThrow(/exactly 5 players/i);
  });

  it("rejects captain not in the five", async () => {
    const fx = await seedFixtures();
    const ids = fx.playerIds;
    await expect(
      getDb().transaction(async (tx) => {
        const [team] = await tx
          .insert(fantasyTeams)
          .values({
            managerId: fx.managerId,
            matchdayId: fx.matchdayId,
            captainPlayerId: ids[5]!,
            viceCaptainPlayerId: ids[0]!,
          })
          .returning();
        await tx.insert(fantasyTeamPlayers).values(
          ids.slice(0, 5).map((playerId) => ({
            fantasyTeamId: team!.id,
            playerId,
          })),
        );
      }),
    ).rejects.toThrow(/foreign key|violates foreign key/i);
  });
});
