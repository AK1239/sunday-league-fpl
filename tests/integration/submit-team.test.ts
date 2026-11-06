import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { submitTeam } from "@/server/domain/submit-team";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import {
  fantasyTeams,
  fantasyTransfers,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("submitTeam (transfers on)", () => {
  let managerId: string;
  let priorMatchdayId: string;
  let openMatchdayId: string;
  let basePlayerIds: string[];
  let extraPlayerIds: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [manager] = await db
      .insert(users)
      .values({
        email: "transfer-mgr@test.local",
        displayName: "Transfer Mgr",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const [season] = await db.select().from(seasons).limit(1);
    const [rules] = await db.select().from(scoringRuleSets).limit(1);
    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: 10 })
      .where(eq(scoringRuleSets.id, rules!.id));

    const allPlayers = await db.select({ id: players.id }).from(players);
    basePlayerIds = allPlayers.slice(0, 5).map((p) => p.id);
    extraPlayerIds = allPlayers.slice(5, 9).map((p) => p.id);

    const [prior] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 10,
        playedOn: "2026-11-10",
        deadlineAt: new Date("2099-11-10T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    priorMatchdayId = prior!.id;

    await saveFantasyTeam(
      db,
      priorMatchdayId,
      {
        playerIds: basePlayerIds,
        captainPlayerId: basePlayerIds[0]!,
        viceCaptainPlayerId: basePlayerIds[1]!,
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
      .where(eq(matchdays.id, priorMatchdayId));

    const [open] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 11,
        playedOn: "2026-11-17",
        deadlineAt: new Date("2099-11-17T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    openMatchdayId = open!.id;
  });

  function pickWithOneTransfer() {
    return {
      playerIds: [
        extraPlayerIds[0]!,
        basePlayerIds[1]!,
        basePlayerIds[2]!,
        basePlayerIds[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: extraPlayerIds[0]!,
      viceCaptainPlayerId: basePlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
    };
  }

  it("records one free transfer against the base squad", async () => {
    const db = getDb();
    const result = await submitTeam(
      db,
      openMatchdayId,
      pickWithOneTransfer(),
      managerId,
    );
    expect(result.summary?.made).toBe(1);
    expect(result.summary?.extra).toBe(0);

    const transfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, openMatchdayId));
    expect(transfers).toHaveLength(1);
    expect(transfers[0]!.playerOutId).toBe(basePlayerIds[0]);
  });

  it("is idempotent when the same squad is submitted again", async () => {
    const db = getDb();
    const pick = pickWithOneTransfer();
    const first = await submitTeam(db, openMatchdayId, pick, managerId);
    const second = await submitTeam(
      db,
      openMatchdayId,
      { ...pick, expectedVersion: first.version },
      managerId,
    );
    expect(second.teamId).toBe(first.teamId);
    expect(second.version).toBe(first.version);

    const transfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, openMatchdayId));
    expect(transfers).toHaveLength(1);
  });

  it("rejects extra transfers without penalty acknowledgement", async () => {
    const db = getDb();
    const pick = {
      playerIds: [
        extraPlayerIds[0]!,
        extraPlayerIds[1]!,
        extraPlayerIds[2]!,
        extraPlayerIds[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: extraPlayerIds[0]!,
      viceCaptainPlayerId: extraPlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
    };

    await expect(
      submitTeam(db, openMatchdayId, pick, managerId),
    ).rejects.toMatchObject({
      code: "PENALTY_NOT_CONFIRMED",
    });
  });

  it("accepts extra transfers when penalty is acknowledged", async () => {
    const db = getDb();
    const pick = {
      playerIds: [
        extraPlayerIds[0]!,
        extraPlayerIds[1]!,
        extraPlayerIds[2]!,
        extraPlayerIds[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: extraPlayerIds[0]!,
      viceCaptainPlayerId: extraPlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 4,
    };

    const result = await submitTeam(db, openMatchdayId, pick, managerId);
    expect(result.summary?.made).toBe(4);
    expect(result.summary?.freeAvailable).toBe(3);
    expect(result.summary?.extra).toBe(1);
    expect(result.summary?.transferPenalty).toBe(-4);
  });

  it("returns CONFLICT when expectedVersion is stale", async () => {
    const db = getDb();
    const first = await submitTeam(
      db,
      openMatchdayId,
      pickWithOneTransfer(),
      managerId,
    );

    const changed = {
      ...pickWithOneTransfer(),
      playerIds: [
        extraPlayerIds[1]!,
        basePlayerIds[1]!,
        basePlayerIds[2]!,
        basePlayerIds[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: extraPlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
    };

    await expect(
      submitTeam(db, openMatchdayId, changed, managerId),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const [team] = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.id, first.teamId));
    expect(team!.version).toBe(first.version);
  });

  it("serialises concurrent submits for one manager", async () => {
    const db = getDb();
    const pickA = pickWithOneTransfer();
    const pickB = {
      ...pickWithOneTransfer(),
      playerIds: [
        extraPlayerIds[1]!,
        basePlayerIds[1]!,
        basePlayerIds[2]!,
        basePlayerIds[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: extraPlayerIds[1]!,
    };

    const results = await Promise.allSettled([
      submitTeam(db, openMatchdayId, pickA, managerId),
      submitTeam(db, openMatchdayId, pickB, managerId),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length + rejected.length).toBe(2);
    expect(rejected.length).toBeGreaterThanOrEqual(1);

    const transfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, openMatchdayId));
    expect(transfers.length).toBeLessThanOrEqual(1);
  });
});
