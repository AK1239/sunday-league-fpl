import { describe, expect, it, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { grantFreeTransferAdjustment } from "@/server/domain/admin-transfers";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { submitTeam } from "@/server/domain/submit-team";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import {
  managerMatchdayScores,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("admin transfers", () => {
  let adminId: string;
  let managerId: string;
  let gw10Id: string;
  let gw11Id: string;
  let basePlayerIds: string[];
  let seasonId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [admin] = await db
      .insert(users)
      .values({
        email: "admin-transfers@test.local",
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
        email: "mgr-adj@test.local",
        displayName: "Mgr Adj",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const [season] = await db.select().from(seasons).limit(1);
    seasonId = season!.id;
    const [rules] = await db.select().from(scoringRuleSets).limit(1);
    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: 10 })
      .where(eq(scoringRuleSets.id, rules!.id));

    const allPlayers = await db.select({ id: players.id }).from(players);
    basePlayerIds = allPlayers.slice(0, 5).map((p) => p.id);
    const extra = allPlayers.slice(5, 9).map((p) => p.id);

    const [gw10] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 10,
        playedOn: "2026-11-10",
        deadlineAt: new Date("2026-11-10T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    gw10Id = gw10!.id;

    await saveFantasyTeam(
      db,
      gw10Id,
      {
        playerIds: basePlayerIds,
        captainPlayerId: basePlayerIds[0]!,
        viceCaptainPlayerId: basePlayerIds[1]!,
      },
      { mode: "manager", managerId },
    );

    await db
      .update(matchdays)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(matchdays.id, gw10Id));

    const [gw11] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 11,
        playedOn: "2026-11-17",
        deadlineAt: new Date("2099-11-17T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    gw11Id = gw11!.id;

    const nextPick = {
      playerIds: [
        extra[0]!,
        extra[1]!,
        extra[2]!,
        extra[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: extra[0]!,
      viceCaptainPlayerId: extra[1]!,
    };

    await submitTeam(
      db,
      gw11Id,
      {
        ...nextPick,
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
      .where(eq(matchdays.id, gw11Id));

    await recomputeMatchday(gw11Id);
  });

  it("grant adjustment can reduce a recorded penalty on a locked window", async () => {
    const db = getDb();

    const [beforeScore] = await db
      .select({ transferPenalty: managerMatchdayScores.transferPenalty })
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, gw11Id),
        ),
      );
    expect(beforeScore?.transferPenalty).toBe(-4);

    const [windowBefore] = await db
      .select({ freeAvailable: managerTransferWindows.freeAvailable })
      .from(managerTransferWindows)
      .where(
        and(
          eq(managerTransferWindows.managerId, managerId),
          eq(managerTransferWindows.matchdayId, gw11Id),
        ),
      );
    expect(windowBefore!.freeAvailable).toBe(3);

    await grantFreeTransferAdjustment(db, {
      adminId,
      managerId,
      matchdayId: gw11Id,
      delta: 1,
      reason: "Compensation for league error",
    });

    const [windowAfter] = await db
      .select({ freeAvailable: managerTransferWindows.freeAvailable })
      .from(managerTransferWindows)
      .where(
        and(
          eq(managerTransferWindows.managerId, managerId),
          eq(managerTransferWindows.matchdayId, gw11Id),
        ),
      );

    expect(windowAfter!.freeAvailable).toBe(4);

    const [afterScore] = await db
      .select({ transferPenalty: managerMatchdayScores.transferPenalty })
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, gw11Id),
        ),
      );

    expect(afterScore!.transferPenalty).toBe(0);
  });
});
