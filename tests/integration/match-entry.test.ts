import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  saveMatchDraftAdmin,
  MatchEntryError,
} from "@/server/domain/match-entry";
import { matchdays, matches, players, seasons, users } from "@/server/db/schema";
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

    playerIds = (await db.select({ id: players.id }).from(players).limit(5)).map(
      (p) => p.id,
    );
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
});
