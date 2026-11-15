import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { getPublicTransferTrends } from "@/server/queries/transfer-trends";
import {
  fantasyTransfers,
  matchdays,
  players,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

describe.skipIf(!process.env.DATABASE_URL)("transfer trends", () => {
  let md: { id: string; number: number };
  let managers: string[];
  let pl: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    const [m] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 2,
        playedOn: "2026-11-22",
        deadlineAt: new Date("2026-11-22T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    md = { id: m!.id, number: 2 };
    managers = (
      await db
        .insert(users)
        .values(
          [1, 2, 3].map((i) => ({
            email: `tt${i}@test.local`,
            displayName: `M${i}`,
            passwordHash: "x",
            role: "manager" as const,
            status: "active" as const,
          })),
        )
        .returning({ id: users.id })
    ).map((u) => u.id);
    pl = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
        .limit(4)
    ).map((p) => p.id);
  });

  it("hides below the minimum, then ranks in/out ignoring voided", async () => {
    const db = getDb();
    const [season] = await db.select({ id: seasons.id }).from(seasons).limit(1);
    const ins = (
      managerId: string,
      out: string,
      inn: string,
      status: "active" | "void" = "active",
    ) =>
      db.insert(fantasyTransfers).values({
        seasonId: season!.id,
        managerId,
        matchdayId: md.id,
        seq: 1,
        playerOutId: out,
        playerInId: inn,
        status,
      });

    await ins(managers[0]!, pl[0]!, pl[1]!);
    await ins(managers[1]!, pl[0]!, pl[1]!);
    expect(await getPublicTransferTrends(db, md)).toBeNull();

    await ins(managers[2]!, pl[2]!, pl[1]!);
    // voided transfers do not count (distinct manager unique index is partial on active)
    await ins(managers[2]!, pl[3]!, pl[0]!, "void");

    const t = await getPublicTransferTrends(db, md);
    expect(t!.totalTransfers).toBe(3);
    expect(t!.managers).toBe(3);
    expect(t!.mostIn[0]).toMatchObject({ playerId: pl[1], count: 3 });
    expect(t!.mostOut[0]).toMatchObject({ playerId: pl[0], count: 2 });
  });
});
