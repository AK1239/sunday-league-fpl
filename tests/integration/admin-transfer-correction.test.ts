import { describe, expect, it, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { applyAdminSquadTransferCorrection } from "@/server/domain/admin-transfers";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { submitTeam } from "@/server/domain/submit-team";
import {
  fantasyTransfers,
  managerMatchdayScores,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("admin transfer correction", () => {
  let adminId: string;
  let managerId: string;
  let gw11Id: string;
  let basePlayerIds: string[];
  let extraPlayerIds: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [admin] = await db
      .insert(users)
      .values({
        email: "admin-corr@test.local",
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
        email: "mgr-corr@test.local",
        displayName: "Mgr",
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

    const [gw10] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 10,
        playedOn: "2026-11-10",
        deadlineAt: new Date("2026-11-10T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    await saveFantasyTeam(
      db,
      gw10!.id,
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
      .where(eq(matchdays.id, gw10!.id));

    const [gw11] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 11,
        playedOn: "2026-11-17",
        deadlineAt: new Date("2026-11-17T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    gw11Id = gw11!.id;

    await submitTeam(
      db,
      gw11Id,
      {
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
      },
      managerId,
    );

    await db
      .update(matchdays)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(matchdays.id, gw11Id));
    await recomputeMatchday(gw11Id);
  });

  it("voids manager transfers and records admin_correction rows", async () => {
    const db = getDb();

    const correctedPick = {
      playerIds: [
        basePlayerIds[0]!,
        basePlayerIds[1]!,
        basePlayerIds[2]!,
        basePlayerIds[3]!,
        basePlayerIds[4]!,
      ],
      captainPlayerId: basePlayerIds[0]!,
      viceCaptainPlayerId: basePlayerIds[1]!,
    };

    await saveFantasyTeam(db, gw11Id, correctedPick, {
      mode: "admin_override",
      adminUserId: adminId,
      targetManagerId: managerId,
      reason: "Revert mistaken transfers",
    });

    const { applied } = await applyAdminSquadTransferCorrection(db, {
      adminUserId: adminId,
      managerId,
      matchdayId: gw11Id,
      pick: correctedPick,
      reason: "Revert mistaken transfers",
    });
    expect(applied).toBe(true);

    const voidRows = await db
      .select({ source: fantasyTransfers.source, status: fantasyTransfers.status })
      .from(fantasyTransfers)
      .where(
        and(
          eq(fantasyTransfers.managerId, managerId),
          eq(fantasyTransfers.matchdayId, gw11Id),
          eq(fantasyTransfers.status, "void"),
        ),
      );
    expect(voidRows.length).toBeGreaterThan(0);
    expect(voidRows.every((r) => r.source === "manager")).toBe(true);

    const active = await db
      .select({ source: fantasyTransfers.source })
      .from(fantasyTransfers)
      .where(
        and(
          eq(fantasyTransfers.managerId, managerId),
          eq(fantasyTransfers.matchdayId, gw11Id),
          eq(fantasyTransfers.status, "active"),
        ),
      );
    expect(active).toHaveLength(0);

    const [score] = await db
      .select({ transferPenalty: managerMatchdayScores.transferPenalty })
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, gw11Id),
        ),
      );
    expect(score!.transferPenalty).toBe(0);
  });
});
