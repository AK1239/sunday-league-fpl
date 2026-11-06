import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import {
  managerMatchdayScores,
  matchdays,
  seasons,
  users,
} from "@/server/db/schema";
import { getManagerStandings } from "@/server/queries/manager-standings";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("manager standings before any points", () => {
  let seasonId: string;
  let ids: Record<string, string>;

  async function addUser(
    email: string,
    displayName: string,
    role: "manager" | "admin",
    status: "active" | "disabled" = "active",
  ) {
    const [row] = await getDb()
      .insert(users)
      .values({ email, displayName, passwordHash: "x", role, status })
      .returning();
    return row!.id;
  }

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    const [season] = await getDb().select({ id: seasons.id }).from(seasons);
    seasonId = season!.id;
    ids = {
      bea: await addUser("bea@test.local", "Bea", "manager"),
      cy: await addUser("cy@test.local", "Cy", "manager"),
      al: await addUser("al@test.local", "Al", "manager"),
      boss: await addUser("boss@test.local", "Boss", "admin"),
      gone: await addUser("gone@test.local", "Gone", "manager", "disabled"),
    };
  });

  it("is empty by default (awards must never crown an unscored manager)", async () => {
    expect(await getManagerStandings(getDb(), seasonId)).toEqual([]);
  });

  it("lists every active manager at rank 1 on 0 pts, without admins or disabled users", async () => {
    const rows = await getManagerStandings(getDb(), seasonId, {
      includeUnscored: true,
    });
    expect(rows.map((r) => r.displayName)).toEqual(["Al", "Bea", "Cy"]);
    expect(rows.every((r) => r.rank === 1 && r.totalPoints === 0)).toBe(true);
  });

  it("ranks a scored manager first and shares rank among the unscored", async () => {
    const db = getDb();
    const [md] = await db
      .insert(matchdays)
      .values({
        seasonId,
        number: 1,
        playedOn: "2026-11-01",
        deadlineAt: new Date("2026-11-01T13:00:00.000Z"),
        status: "published",
        publishedAt: new Date(),
      })
      .returning();
    await db.insert(managerMatchdayScores).values({
      managerId: ids.cy!,
      matchdayId: md!.id,
      seasonId,
      squadPoints: 12,
      totalPoints: 12,
      teamSource: "manual",
    });

    const withUnscored = await getManagerStandings(db, seasonId, {
      includeUnscored: true,
    });
    expect(
      withUnscored.map((r) => [r.displayName, r.rank, r.totalPoints]),
    ).toEqual([
      ["Cy", 1, 12],
      ["Al", 2, 0],
      ["Bea", 2, 0],
    ]);

    // Default mode still lists only managers who have scored.
    const scoredOnly = await getManagerStandings(db, seasonId);
    expect(scoredOnly.map((r) => r.displayName)).toEqual(["Cy"]);
  });
});
