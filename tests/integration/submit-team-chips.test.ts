import { describe, expect, it, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { submitTeam } from "@/server/domain/submit-team";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import {
  fantasyTeams,
  fantasyTransfers,
  managerChipPlays,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasonChips,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

async function seedTransferWindowFixture() {
  const db = getDb();
  const [manager] = await db
    .insert(users)
    .values({
      email: "chip-submit@test.local",
      displayName: "Chip Submit",
      passwordHash: "x",
      role: "manager",
      status: "active",
    })
    .returning();

  const [season] = await db.select().from(seasons).limit(1);
  await db.insert(seasonChips).values([
    { seasonId: season!.id, chipCode: "triple_captain", enabled: true },
    { seasonId: season!.id, chipCode: "wildcard", enabled: true },
    { seasonId: season!.id, chipCode: "free_hit", enabled: true },
    { seasonId: season!.id, chipCode: "bench_boost", enabled: true },
  ]);
  const [rules] = await db.select().from(scoringRuleSets).limit(1);
  await db
    .update(scoringRuleSets)
    .set({ transfersStartMatchday: 10 })
    .where(eq(scoringRuleSets.id, rules!.id));

  const allPlayers = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.active, true));
  const basePlayerIds = allPlayers.slice(0, 5).map((p) => p.id);
  const extraPlayerIds = allPlayers.slice(5, 10).map((p) => p.id);

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

  await saveFantasyTeam(
    db,
    prior!.id,
    {
      playerIds: basePlayerIds,
      captainPlayerId: basePlayerIds[0]!,
      viceCaptainPlayerId: basePlayerIds[1]!,
    },
    { mode: "manager", managerId: manager!.id },
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
      seasonId: season!.id,
      number: 11,
      playedOn: "2026-11-17",
      deadlineAt: new Date("2099-11-17T13:00:00.000Z"),
      status: "scheduled",
    })
    .returning();

  return {
    managerId: manager!.id,
    seasonId: season!.id,
    openMatchdayId: open!.id,
    basePlayerIds,
    extraPlayerIds,
  };
}

describe.skipIf(!hasDatabase)("submitTeam chips (phase 5)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
  });

  it("wildcard records transfers with unlimited window and chip play", async () => {
    const db = getDb();
    const fx = await seedTransferWindowFixture();
    const pick = {
      playerIds: [
        fx.extraPlayerIds[0]!,
        fx.extraPlayerIds[1]!,
        fx.extraPlayerIds[2]!,
        fx.basePlayerIds[3]!,
        fx.basePlayerIds[4]!,
      ],
      captainPlayerId: fx.extraPlayerIds[0]!,
      viceCaptainPlayerId: fx.extraPlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
      chipCode: "wildcard",
    };

    const result = await submitTeam(db, fx.openMatchdayId, pick, fx.managerId);
    expect(result.summary?.extra).toBe(0);
    expect(result.summary?.made).toBe(3);

    const [window] = await db
      .select()
      .from(managerTransferWindows)
      .where(
        and(
          eq(managerTransferWindows.managerId, fx.managerId),
          eq(managerTransferWindows.matchdayId, fx.openMatchdayId),
        ),
      );
    expect(window?.unlimited).toBe(true);
    expect(window?.chipCode).toBe("wildcard");

    const plays = await db
      .select()
      .from(managerChipPlays)
      .where(eq(managerChipPlays.managerId, fx.managerId));
    expect(plays).toHaveLength(1);
    expect(plays[0]!.chipCode).toBe("wildcard");

    const transfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, fx.openMatchdayId));
    expect(transfers.length).toBeGreaterThan(0);
  });

  it("free hit saves a temporary squad with no transfer rows", async () => {
    const db = getDb();
    const fx = await seedTransferWindowFixture();
    const pick = {
      playerIds: fx.extraPlayerIds.slice(0, 5),
      captainPlayerId: fx.extraPlayerIds[0]!,
      viceCaptainPlayerId: fx.extraPlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
      chipCode: "free_hit",
    };

    await submitTeam(db, fx.openMatchdayId, pick, fx.managerId);

    const [team] = await db
      .select()
      .from(fantasyTeams)
      .where(
        and(
          eq(fantasyTeams.managerId, fx.managerId),
          eq(fantasyTeams.matchdayId, fx.openMatchdayId),
        ),
      );
    expect(team?.squadKind).toBe("free_hit");

    const transfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, fx.openMatchdayId));
    expect(transfers).toHaveLength(0);

    const [window] = await db
      .select()
      .from(managerTransferWindows)
      .where(eq(managerTransferWindows.matchdayId, fx.openMatchdayId));
    expect(window?.chipCode).toBe("free_hit");
    expect(window?.unlimited).toBe(true);
  });

  it("is idempotent when squad and chip state are unchanged", async () => {
    const db = getDb();
    const fx = await seedTransferWindowFixture();
    const pick = {
      playerIds: [...fx.basePlayerIds],
      captainPlayerId: fx.basePlayerIds[0]!,
      viceCaptainPlayerId: fx.basePlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
      chipCode: "triple_captain",
    };

    const first = await submitTeam(db, fx.openMatchdayId, pick, fx.managerId);
    const second = await submitTeam(
      db,
      fx.openMatchdayId,
      {
        ...pick,
        expectedVersion: first.version,
      },
      fx.managerId,
    );

    expect(second.version).toBe(first.version);
    const plays = await db
      .select()
      .from(managerChipPlays)
      .where(eq(managerChipPlays.managerId, fx.managerId));
    expect(plays).toHaveLength(1);
  });

  it("allows only one active chip per gameweek under concurrency", async () => {
    const db = getDb();
    const fx = await seedTransferWindowFixture();
    const basePick = {
      playerIds: [...fx.basePlayerIds],
      captainPlayerId: fx.basePlayerIds[0]!,
      viceCaptainPlayerId: fx.basePlayerIds[1]!,
      expectedVersion: 0,
      acknowledgedPenalty: 0,
    };

    const results = await Promise.allSettled([
      submitTeam(
        db,
        fx.openMatchdayId,
        {
          ...basePick,
          chipCode: "triple_captain",
        },
        fx.managerId,
      ),
      submitTeam(
        db,
        fx.openMatchdayId,
        {
          ...basePick,
          chipCode: "wildcard",
        },
        fx.managerId,
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const plays = await db
      .select()
      .from(managerChipPlays)
      .where(
        and(
          eq(managerChipPlays.managerId, fx.managerId),
          eq(managerChipPlays.matchdayId, fx.openMatchdayId),
        ),
      );
    expect(plays).toHaveLength(1);
  });
});
