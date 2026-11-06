import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { cancelMatchdayAdmin } from "@/server/domain/matchdays-admin";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import { submitTeam } from "@/server/domain/submit-team";
import {
  fantasyTeams,
  fantasyTransfers,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { getManagerStandings } from "@/server/queries/manager-standings";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("transfer lifecycle (phase 5)", () => {
  let adminId: string;
  let managerId: string;
  let seasonId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [admin] = await db
      .insert(users)
      .values({
        email: "lifecycle-admin@test.local",
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
        email: "lifecycle-mgr@test.local",
        displayName: "Lifecycle Mgr",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const [season] = await db
      .select({ id: seasons.id, ruleSetId: seasons.ruleSetId })
      .from(seasons)
      .limit(1);
    seasonId = season!.id;

    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: 1 })
      .where(eq(scoringRuleSets.id, season!.ruleSetId));
  });

  it("voids transfers and pending squads when a gameweek is cancelled (§6.1)", async () => {
    const db = getDb();
    const playersList = await db.select({ id: players.id }).from(players);
    const base = playersList.slice(0, 5).map((p) => p.id);
    const extra = playersList[5]!.id;

    const [prior] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 1,
        playedOn: "2026-11-01",
        deadlineAt: new Date("2099-11-01T13:00:00.000Z"),
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
        deadlineAt: new Date("2026-11-01T13:00:00.000Z"),
      })
      .where(eq(matchdays.id, prior!.id));

    const [open] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 2,
        playedOn: "2026-11-08",
        deadlineAt: new Date("2099-11-08T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    await submitTeam(
      db,
      open!.id,
      {
        playerIds: [extra, base[1]!, base[2]!, base[3]!, base[4]!],
        captainPlayerId: extra,
        viceCaptainPlayerId: base[1]!,
        expectedVersion: 0,
        acknowledgedPenalty: 0,
      },
      managerId,
    );

    await cancelMatchdayAdmin(db, adminId, open!.id);

    const activeTransfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, open!.id));
    expect(activeTransfers.every((t) => t.status === "void")).toBe(true);

    const teamsOnCancelled = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.matchdayId, open!.id));
    expect(teamsOnCancelled).toHaveLength(0);

    const [window] = await db
      .select()
      .from(managerTransferWindows)
      .where(eq(managerTransferWindows.matchdayId, open!.id));
    expect(window?.voidedAt).not.toBeNull();
  });

  it("allows a mid-season join as a free initial build (§6.2)", async () => {
    const db = getDb();
    const playersList = await db.select({ id: players.id }).from(players);
    const squad = playersList.slice(0, 5).map((p) => p.id);

    const [open] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 5,
        playedOn: "2026-12-01",
        deadlineAt: new Date("2099-12-01T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    const result = await submitTeam(
      db,
      open!.id,
      {
        playerIds: squad,
        captainPlayerId: squad[0]!,
        viceCaptainPlayerId: squad[1]!,
        expectedVersion: 0,
        acknowledgedPenalty: 0,
      },
      managerId,
    );

    expect(result.summary).toBeNull();

    const transfers = await db
      .select()
      .from(fantasyTransfers)
      .where(eq(fantasyTransfers.matchdayId, open!.id));
    expect(transfers).toHaveLength(0);
  });

  it("blocks disabled managers from submitting (§6.9)", async () => {
    const db = getDb();
    await db
      .update(users)
      .set({ status: "disabled" })
      .where(eq(users.id, managerId));

    const playersList = await db.select({ id: players.id }).from(players);
    const squad = playersList.slice(0, 5).map((p) => p.id);

    const [open] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 3,
        playedOn: "2026-11-15",
        deadlineAt: new Date("2099-11-15T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    await expect(
      submitTeam(
        db,
        open!.id,
        {
          playerIds: squad,
          captainPlayerId: squad[0]!,
          viceCaptainPlayerId: squad[1]!,
          expectedVersion: 0,
          acknowledgedPenalty: 0,
        },
        managerId,
      ),
    ).rejects.toMatchObject({ code: "MANAGER_DISABLED" });
  });

  it("excludes disabled managers from public standings", async () => {
    const db = getDb();
    const { recomputeMatchday } = await import(
      "@/server/domain/recompute-matchday"
    );
    const playersList = await db.select({ id: players.id }).from(players);
    const squad = playersList.slice(0, 5).map((p) => p.id);

    const [md] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 4,
        playedOn: "2026-11-20",
        deadlineAt: new Date("2026-11-20T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();

    await saveFantasyTeam(
      db,
      md!.id,
      {
        playerIds: squad,
        captainPlayerId: squad[0]!,
        viceCaptainPlayerId: squad[1]!,
      },
      { mode: "manager", managerId },
    );

    await db
      .update(matchdays)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(matchdays.id, md!.id));

    await recomputeMatchday(md!.id);

    const beforeDisable = await getManagerStandings(db, seasonId);
    expect(beforeDisable.some((s) => s.managerId === managerId)).toBe(true);

    await db
      .update(users)
      .set({ status: "disabled" })
      .where(eq(users.id, managerId));

    const afterDisable = await getManagerStandings(db, seasonId);
    expect(afterDisable.some((s) => s.managerId === managerId)).toBe(false);
  });
});
