import { describe, expect, it, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { cancelMatchdayAdmin } from "@/server/domain/matchdays-admin";
import {
  enableChipsForSeason,
  EnableSeasonChipsError,
} from "@/server/domain/enable-season-chips";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import { submitTeam } from "@/server/domain/submit-team";
import {
  fantasyTeams,
  managerChipPlays,
  matchdays,
  players,
  scoringRuleSets,
  seasonChips,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("chips lifecycle (phase 6)", () => {
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
        email: "chips-life-admin@test.local",
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
        email: "chips-life-mgr@test.local",
        displayName: "Mgr",
        passwordHash: "x",
        role: "manager",
        status: "active",
      })
      .returning();
    managerId = manager!.id;

    const [season] = await db.select().from(seasons).limit(1);
    seasonId = season!.id;

    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: 1 })
      .where(eq(scoringRuleSets.id, season!.ruleSetId));
  });

  it("enableChipsForSeason inserts four chip rows with audit", async () => {
    const db = getDb();
    const result = await enableChipsForSeason(db, adminId, seasonId);
    expect(result.chipCount).toBe(4);
    expect(result.availableFromMatchday).toBeGreaterThanOrEqual(1);

    const rows = await db
      .select()
      .from(seasonChips)
      .where(eq(seasonChips.seasonId, seasonId));
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.enabled)).toBe(true);

    await expect(
      enableChipsForSeason(db, adminId, seasonId),
    ).rejects.toBeInstanceOf(EnableSeasonChipsError);
  });

  it("voids active chip plays when a gameweek is cancelled", async () => {
    const db = getDb();
    await enableChipsForSeason(db, adminId, seasonId);

    const playersList = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.active, true));
    const base = playersList.slice(0, 5).map((p) => p.id);
    const extra = playersList.slice(5, 10).map((p) => p.id);

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
        playerIds: extra,
        captainPlayerId: extra[0]!,
        viceCaptainPlayerId: extra[1]!,
        expectedVersion: 0,
        acknowledgedPenalty: 0,
        chipCode: "free_hit",
      },
      managerId,
    );

    await cancelMatchdayAdmin(db, adminId, open!.id);

    const [play] = await db
      .select()
      .from(managerChipPlays)
      .where(
        and(
          eq(managerChipPlays.managerId, managerId),
          eq(managerChipPlays.matchdayId, open!.id),
        ),
      );
    expect(play?.status).toBe("void");
    expect(play?.voidReason).toMatch(/cancelled/i);

    const teams = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.matchdayId, open!.id));
    expect(teams).toHaveLength(0);
  });

  it("blocks disabled managers from playing chips", async () => {
    const db = getDb();
    await enableChipsForSeason(db, adminId, seasonId);
    await db
      .update(users)
      .set({ status: "disabled" })
      .where(eq(users.id, managerId));

    const squad = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
    ).slice(0, 5);
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
          playerIds: squad.map((p) => p.id),
          captainPlayerId: squad[0]!.id,
          viceCaptainPlayerId: squad[1]!.id,
          expectedVersion: 0,
          acknowledgedPenalty: 0,
          chipCode: "triple_captain",
        },
        managerId,
      ),
    ).rejects.toMatchObject({ code: "MANAGER_DISABLED" });
  });
});
