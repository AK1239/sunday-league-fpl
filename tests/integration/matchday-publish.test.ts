import { describe, expect, it, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { saveMatchDraftAdmin } from "@/server/domain/match-entry";
import {
  publishMatchdayAdmin,
  recalculateMatchdayAdmin,
  unpublishMatchdayAdmin,
} from "@/server/domain/matchday-publish";
import { loadScoringInspector } from "@/server/domain/scoring-inspector";
import {
  matchdays,
  matches,
  players,
  pointLedger,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("matchday publish & inspector", () => {
  let adminId: string;
  let matchdayId: string;
  let playerIds: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    const [admin] = await db
      .insert(users)
      .values({
        email: "publish-admin@test.local",
        displayName: "Admin",
        passwordHash: "x",
        role: "admin",
        status: "active",
      })
      .returning();
    adminId = admin!.id;

    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    const [md] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 99,
        playedOn: "2026-11-16",
        deadlineAt: new Date("2026-11-16T13:00:00.000Z"),
        status: "draft",
      })
      .returning();
    matchdayId = md!.id;

    playerIds = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
        .limit(5)
    ).map((p) => p.id);
  });

  async function seedValidMatch() {
    const db = getDb();
    const [p1, p2, p3, p4, p5] = playerIds;
    await saveMatchDraftAdmin(
      db,
      adminId,
      matchdayId,
      {
        matchNo: 1,
        scoreA: 1,
        scoreB: 0,
        sideAPlayerIds: [p1!, p2!, p3!],
        sideBPlayerIds: [p4!, p5!],
        sideAGoalkeeperId: p3!,
        sideBGoalkeeperId: null,
        goals: [{ side: "A", scorerId: p1!, assistId: null }],
        mvpPlayerId: p1!,
      },
      [p1!, p2!, p3!, p4!, p5!],
    );
  }

  it("publishes, builds ledger, and recalculates idempotently", async () => {
    const db = getDb();
    await seedValidMatch();

    await publishMatchdayAdmin(db, adminId, matchdayId);

    const [md] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId));
    expect(md!.status).toBe("published");
    expect(md!.publishedAt).not.toBeNull();

    const ledger = await db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));
    expect(ledger.length).toBeGreaterThan(0);

    const inspectorBefore = await loadScoringInspector(db, matchdayId);
    expect(inspectorBefore!.playerLedger.length).toBe(ledger.length);

    await recalculateMatchdayAdmin(db, adminId, matchdayId);
    await recalculateMatchdayAdmin(db, adminId, matchdayId);

    const ledgerAfter = await db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));
    expect(ledgerAfter.length).toBe(ledger.length);

    const totalsBefore = inspectorBefore!.managerTotals;
    const inspectorAfter = await loadScoringInspector(db, matchdayId);
    expect(inspectorAfter!.managerTotals).toEqual(totalsBefore);
  });

  it("updates ledger when a published match is edited", async () => {
    const db = getDb();
    await seedValidMatch();
    await publishMatchdayAdmin(db, adminId, matchdayId);

    const [{ sum: beforeSum }] = await db
      .select({
        sum: sql<number>`coalesce(sum(${pointLedger.points}), 0)`.mapWith(
          Number,
        ),
      })
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));

    const [p1, p2, p3, p4, p5] = playerIds;
    const matchesOnDay = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.matchdayId, matchdayId));
    const matchId = matchesOnDay[0]!.id;

    await saveMatchDraftAdmin(
      db,
      adminId,
      matchdayId,
      {
        matchId,
        matchNo: 1,
        scoreA: 3,
        scoreB: 0,
        sideAPlayerIds: [p1!, p2!, p3!],
        sideBPlayerIds: [p4!, p5!],
        sideAGoalkeeperId: p3!,
        sideBGoalkeeperId: null,
        goals: [
          { side: "A", scorerId: p1!, assistId: null },
          { side: "A", scorerId: p1!, assistId: p2! },
          { side: "A", scorerId: p3!, assistId: null },
        ],
        mvpPlayerId: p2!,
      },
      [p1!, p2!, p3!, p4!, p5!],
    );

    const [{ sum: afterSum }] = await db
      .select({
        sum: sql<number>`coalesce(sum(${pointLedger.points}), 0)`.mapWith(
          Number,
        ),
      })
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));

    expect(afterSum).toBeGreaterThan(beforeSum);
  });

  it("unpublish returns matchday to draft and clears published ledger for that day", async () => {
    const db = getDb();
    await seedValidMatch();
    await publishMatchdayAdmin(db, adminId, matchdayId);

    await unpublishMatchdayAdmin(db, adminId, matchdayId);

    const [md] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId));
    expect(md!.status).toBe("draft");
    expect(md!.publishedAt).toBeNull();

    const ledger = await db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));
    expect(ledger.length).toBe(0);
  });
});
