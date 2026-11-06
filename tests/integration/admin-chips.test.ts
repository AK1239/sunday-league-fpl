import { describe, expect, it, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  voidChipPlayAdmin,
  forceActivateChipAdmin,
} from "@/server/domain/admin-chips";
import { submitTeam } from "@/server/domain/submit-team";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import {
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

describe.skipIf(!hasDatabase)("admin chips (phase 8)", () => {
  let adminId: string;
  let managerId: string;
  let openMatchdayId: string;
  let basePlayerIds: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [admin] = await db
      .insert(users)
      .values({
        email: "admin-chips@test.local",
        displayName: "Admin",
        passwordHash: "x",
        role: "admin",
        status: "active",
      })
      .returning();
    adminId = admin!.id;

    const [manager] = await db
      .insert(users)
      .values({
        email: "mgr-admin-chips@test.local",
        displayName: "Mgr",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const [season] = await db.select().from(seasons).limit(1);
    await db.insert(seasonChips).values([
      { seasonId: season!.id, chipCode: "triple_captain", enabled: true },
      { seasonId: season!.id, chipCode: "wildcard", enabled: true },
      { seasonId: season!.id, chipCode: "free_hit", enabled: true },
      { seasonId: season!.id, chipCode: "bench_boost", enabled: true },
    ]);

    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: 10 })
      .where(eq(scoringRuleSets.id, season!.ruleSetId));

    const allPlayers = await db.select({ id: players.id }).from(players);
    basePlayerIds = allPlayers.slice(0, 5).map((p) => p.id);

    const [prior] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 10,
        playedOn: "2026-11-10",
        deadlineAt: new Date("2099-11-10T13:00:00.000Z"),
        status: "published",
        publishedAt: new Date(),
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
      { mode: "manager", managerId },
    );

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

  it("voidChipPlayAdmin refunds chip and clears window mirror", async () => {
    const db = getDb();
    await submitTeam(
      db,
      openMatchdayId,
      {
        playerIds: basePlayerIds,
        captainPlayerId: basePlayerIds[0]!,
        viceCaptainPlayerId: basePlayerIds[1]!,
        expectedVersion: 0,
        acknowledgedPenalty: 0,
        chipCode: "triple_captain",
      },
      managerId,
    );

    const [play] = await db
      .select()
      .from(managerChipPlays)
      .where(
        and(
          eq(managerChipPlays.managerId, managerId),
          eq(managerChipPlays.matchdayId, openMatchdayId),
          eq(managerChipPlays.status, "active"),
        ),
      );
    expect(play).toBeTruthy();

    await voidChipPlayAdmin(db, adminId, play!.id, "Admin test void");

    const active = await db
      .select()
      .from(managerChipPlays)
      .where(
        and(
          eq(managerChipPlays.managerId, managerId),
          eq(managerChipPlays.chipCode, "triple_captain"),
          eq(managerChipPlays.status, "active"),
        ),
      );
    expect(active).toHaveLength(0);

    const [window] = await db
      .select()
      .from(managerTransferWindows)
      .where(
        and(
          eq(managerTransferWindows.managerId, managerId),
          eq(managerTransferWindows.matchdayId, openMatchdayId),
        ),
      );
    expect(window?.chipCode).toBeNull();
    expect(window?.unlimited).toBe(false);

    await forceActivateChipAdmin(db, adminId, {
      managerId,
      matchdayId: openMatchdayId,
      chipCode: "triple_captain",
      reason: "Re-activate after void",
    });

    const activeAgain = await db
      .select()
      .from(managerChipPlays)
      .where(
        and(
          eq(managerChipPlays.managerId, managerId),
          eq(managerChipPlays.status, "active"),
          eq(managerChipPlays.chipCode, "triple_captain"),
        ),
      );
    expect(activeAgain).toHaveLength(1);
    expect(activeAgain[0]!.source).toBe("admin");
  });
});
