import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  loadMatchdayEntry,
  saveMatchDraftAdmin,
  MatchEntryError,
} from "@/server/domain/match-entry";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
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

describe.skipIf(!hasDatabase)("match entry", () => {
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
        email: "entry-admin@test.local",
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
        number: 2,
        playedOn: "2026-11-09",
        deadlineAt: new Date("2026-11-09T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    matchdayId = md!.id;

    playerIds = (
      await db.select({ id: players.id }).from(players).limit(5)
    ).map((p) => p.id);
  });

  it("saves a valid match draft and sets matchday to draft", async () => {
    const db = getDb();
    const [p1, p2, p3, p4, p5] = playerIds;

    const { matchId } = await saveMatchDraftAdmin(
      db,
      adminId,
      matchdayId,
      {
        matchNo: 1,
        scoreA: 2,
        scoreB: 1,
        sideAPlayerIds: [p1!, p2!, p3!],
        sideBPlayerIds: [p4!, p5!],
        sideAGoalkeeperId: p3!,
        sideBGoalkeeperId: null,
        goals: [
          { side: "A", scorerId: p1!, assistId: p2! },
          { side: "A", scorerId: p3!, assistId: null },
          { side: "B", scorerId: p4!, assistId: null },
        ],
        mvpPlayerId: p1!,
      },
      [p1!, p2!, p3!, p4!, p5!],
    );

    const [md] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId));
    expect(md!.status).toBe("draft");

    const matchRows = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId));
    expect(matchRows[0]?.scoreA).toBe(2);
  });

  it("rejects scorer not on side", async () => {
    const db = getDb();
    const [p1, p2, p3, p4] = playerIds;

    await expect(
      saveMatchDraftAdmin(
        db,
        adminId,
        matchdayId,
        {
          matchNo: 1,
          scoreA: 1,
          scoreB: 0,
          sideAPlayerIds: [p1!, p2!],
          sideBPlayerIds: [p3!],
          sideAGoalkeeperId: null,
          sideBGoalkeeperId: null,
          goals: [{ side: "A", scorerId: p4!, assistId: null }],
          mvpPlayerId: null,
        },
        [p1!, p2!, p3!, p4!],
      ),
    ).rejects.toBeInstanceOf(MatchEntryError);
  });

  it("scores penalty goal, own goal, penalty save and handball via the ledger", async () => {
    const db = getDb();
    const [p1, p2, p3, p4, p5] = playerIds;

    // Side A: p1, p2, p3 (GK).  Side B: p4, p5.
    // 2-1 to A: p1 penalty, p5 (side B) own goal credited to A... that makes 2-0,
    // so give B a normal goal from p4 → final 2-1.
    const { matchId } = await saveMatchDraftAdmin(
      db,
      adminId,
      matchdayId,
      {
        matchNo: 1,
        scoreA: 2,
        scoreB: 1,
        sideAPlayerIds: [p1!, p2!, p3!],
        sideBPlayerIds: [p4!, p5!],
        sideAGoalkeeperId: p3!,
        sideBGoalkeeperId: null,
        goals: [
          { side: "A", scorerId: p1!, assistId: null, kind: "penalty" },
          { side: "A", scorerId: p5!, assistId: null, kind: "own_goal" },
          { side: "B", scorerId: p4!, assistId: null },
        ],
        incidents: [
          { kind: "penalty_saved", side: "A", playerId: p3! },
          { kind: "handball_blocked", side: "B", playerId: p4! },
        ],
        mvpPlayerId: null,
      },
      [p1!, p2!, p3!, p4!, p5!],
    );

    // Only published matchdays are scored.
    await db
      .update(matchdays)
      .set({ status: "published" })
      .where(eq(matchdays.id, matchdayId));
    await recomputeMatchday(matchdayId);

    const ledger = await db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchId, matchId));
    const pts = (playerId: string, kind: string) =>
      ledger
        .filter((r) => r.playerId === playerId && r.kind === kind)
        .map((r) => r.points);

    expect(pts(p1!, "goal")).toEqual([3]); // penalty replaces the +5
    expect(pts(p5!, "own_goal")).toEqual([-2]);
    expect(pts(p5!, "goal")).toEqual([]);
    expect(pts(p3!, "penalty_saved")).toEqual([5]);
    expect(pts(p4!, "handball")).toEqual([-2]);
    expect(pts(p4!, "goal")).toEqual([5]); // normal goal untouched

    // Stored kinds round-trip through the entry loader.
    const entry = await loadMatchdayEntry(db, matchdayId);
    const saved = entry!.matches[0]!;
    expect(saved.goals.map((g) => g.kind).sort()).toEqual([
      "open_play",
      "own_goal",
      "penalty",
    ]);
    expect(saved.incidents).toHaveLength(2);
  });
});
