import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  loadMatchdayDayStats,
  saveMatchdayDayStatsAdmin,
} from "@/server/domain/day-stats";
import { loadMatchdayEntry } from "@/server/domain/match-entry";
import {
  publishMatchdayAdmin,
  validateMatchdayReadyToPublish,
} from "@/server/domain/matchday-publish";
import { emptyDayStats } from "@/lib/parse-player-results";
import {
  matchdayAttendance,
  matchdays,
  players,
  pointLedger,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

describe.skipIf(!process.env.DATABASE_URL)("day results entry", () => {
  let adminId: string;
  let matchdayId: string;
  let ids: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    const [admin] = await db
      .insert(users)
      .values({
        email: "day-admin@test.local",
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
        number: 5,
        playedOn: "2026-11-15",
        deadlineAt: new Date("2026-11-15T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    matchdayId = md!.id;
    ids = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
        .limit(3)
    ).map((p) => p.id);
  });

  const totals = async (matchdayId: string) => {
    const rows = await getDb()
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));
    const m = new Map<string, number>();
    for (const r of rows)
      m.set(r.playerId, (m.get(r.playerId) ?? 0) + r.points);
    return m;
  };

  it("cannot publish an empty day, then publishes day totals into the ledger", async () => {
    const db = getDb();
    await expect(
      validateMatchdayReadyToPublish(db, matchdayId),
    ).rejects.toMatchObject({ code: "NO_MATCHES" });

    await saveMatchdayDayStatsAdmin(
      db,
      adminId,
      matchdayId,
      [
        {
          playerId: ids[0]!,
          stats: { ...emptyDayStats(), goals: 2, assists: 1 },
        },
        { playerId: ids[1]!, stats: { ...emptyDayStats(), penaltiesSaved: 1 } },
      ],
      [],
    );

    const [md] = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId));
    expect(md!.status).toBe("draft");
    // Listed players automatically attend.
    const att = await db
      .select()
      .from(matchdayAttendance)
      .where(eq(matchdayAttendance.matchdayId, matchdayId));
    expect(att.map((a) => a.playerId).sort()).toEqual(
      [ids[0]!, ids[1]!].sort(),
    );

    await publishMatchdayAdmin(db, adminId, matchdayId);
    const t = await totals(matchdayId);
    expect(t.get(ids[0]!)).toBe(2 + 10 + 3); // attendance + 2 goals + assist
    expect(t.get(ids[1]!)).toBe(2 + 5);
  });

  it("recomputes when edited after publish and survives reload", async () => {
    const db = getDb();
    const save = (goals: number) =>
      saveMatchdayDayStatsAdmin(
        db,
        adminId,
        matchdayId,
        [
          {
            playerId: ids[0]!,
            stats: { ...emptyDayStats(), goals, penaltiesMissed: 1 },
          },
        ],
        [ids[2]!],
      );
    await save(1);
    await publishMatchdayAdmin(db, adminId, matchdayId);
    expect((await totals(matchdayId)).get(ids[0]!)).toBe(2 + 5 - 2);

    await save(3);
    expect((await totals(matchdayId)).get(ids[0]!)).toBe(2 + 15 - 2);
    // extra ticked attendee keeps attendance points
    expect((await totals(matchdayId)).get(ids[2]!)).toBe(2);

    const entry = await loadMatchdayEntry(db, matchdayId);
    expect(entry!.dayStats).toHaveLength(1);
    expect(entry!.dayStats[0]!.stats.goals).toBe(3);
    expect(await loadMatchdayDayStats(db, matchdayId)).toHaveLength(1);
  });
});
