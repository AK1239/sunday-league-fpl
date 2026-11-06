import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { submitTeam } from "@/server/domain/submit-team";
import {
  fantasyTransfers,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

/** The first gameweek (no earlier squad) is a free build, even with transfers starting at GW1. */
describe.skipIf(!hasDatabase)("first squad is free", () => {
  let managerId: string;
  let gw1Id: string;
  let active: string[];

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const db = getDb();

    const [manager] = await db
      .insert(users)
      .values({
        email: "first-squad@test.local",
        displayName: "First Squad",
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
      .set({ transfersStartMatchday: 1 })
      .where(eq(scoringRuleSets.id, rules!.id));

    active = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.active, true))
    ).map((p) => p.id);

    const [gw1] = await db
      .insert(matchdays)
      .values({
        seasonId: season!.id,
        number: 1,
        playedOn: "2099-11-08",
        deadlineAt: new Date("2099-11-08T13:00:00.000Z"),
        status: "scheduled",
      })
      .returning();
    gw1Id = gw1!.id;
  });

  const pick = (ids: string[], expectedVersion: number) => ({
    playerIds: ids,
    captainPlayerId: ids[0]!,
    viceCaptainPlayerId: ids[1]!,
    expectedVersion,
    acknowledgedPenalty: 0,
  });

  it("saves the first squad, then lets all five be changed with no transfers or penalty", async () => {
    const db = getDb();
    const first = await submitTeam(
      db,
      gw1Id,
      pick(active.slice(0, 5), 0),
      managerId,
    );
    expect(first.summary).toBeNull();

    // Change every player before the deadline.
    const second = await submitTeam(
      db,
      gw1Id,
      pick(active.slice(5, 10), first.version),
      managerId,
    );
    expect(second.summary).toBeNull();

    expect(await db.select().from(fantasyTransfers)).toHaveLength(0);
    expect(await db.select().from(managerTransferWindows)).toHaveLength(0);
  });
});
