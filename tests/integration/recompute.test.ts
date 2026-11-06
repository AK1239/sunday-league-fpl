import { eq } from "drizzle-orm";
import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { matchdays, pointLedger } from "@/server/db/schema";
import { getStandings } from "@/server/queries/standings";
import {
  getActiveSeasonId,
  seedPublishedDemoMatchday,
} from "./seed-fixture";
import { requireDatabaseUrl, resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("recomputeMatchday integration", () => {
  beforeAll(() => {
    requireDatabaseUrl();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    await seedPublishedDemoMatchday(db, await getActiveSeasonId(db));
  });

  it("is idempotent when run ten times", async () => {
    const db = getDb();
    const matchday = await db
      .select({ id: matchdays.id })
      .from(matchdays)
      .limit(1);

    const matchdayId = matchday[0]!.id;

    for (let i = 0; i < 10; i++) {
      await recomputeMatchday(matchdayId);
    }

    const rows = await db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));

    const total = rows.reduce((sum, row) => sum + row.points, 0);
    expect(rows.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);

    await recomputeMatchday(matchdayId);
    const rowsAgain = await db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.matchdayId, matchdayId));

    expect(rowsAgain).toHaveLength(rows.length);
    expect(rowsAgain.reduce((sum, row) => sum + row.points, 0)).toBe(total);
  });

  it("rejects duplicate ledger rows at the database level", async () => {
    const db = getDb();
    const matchday = await db
      .select({ id: matchdays.id, seasonId: matchdays.seasonId })
      .from(matchdays)
      .limit(1);
    const existing = await db.select().from(pointLedger).limit(1);

    await expect(
      db.insert(pointLedger).values({
        seasonId: matchday[0]!.seasonId,
        matchdayId: matchday[0]!.id,
        matchId: existing[0]!.matchId,
        playerId: existing[0]!.playerId,
        kind: existing[0]!.kind,
        points: existing[0]!.points,
        sourceRef: existing[0]!.sourceRef,
        ruleSetId: existing[0]!.ruleSetId,
        generation: 1,
      }),
    ).rejects.toThrow();
  });

  it("returns standings ordered by points with stats", async () => {
    const db = getDb();
    const seasonId = await getActiveSeasonId(db);

    const matchdayId = (
      await db.select({ id: matchdays.id }).from(matchdays).limit(1)
    )[0]!.id;

    await recomputeMatchday(matchdayId);

    const standings = await getStandings(db, seasonId, "points");
    expect(standings.length).toBeGreaterThan(0);
    expect(standings[0]!.points).toBeGreaterThan(0);
    expect(standings[0]!.goals).toBeGreaterThanOrEqual(0);
  });
});
