import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  managerMatchdayScores,
  managerRankSnapshots,
  matchdays,
  users,
} from "@/server/db/schema";

export type ManagerStandingRow = {
  managerId: string;
  displayName: string;
  rank: number;
  rankDelta: number;
  totalPoints: number;
  bestGameweekPoints: number;
  lastGameweekPoints: number;
};

export async function getManagerStandings(
  db: AppDb,
  seasonId: string,
): Promise<ManagerStandingRow[]> {
  const totals = db
    .select({
      managerId: managerMatchdayScores.managerId,
      totalPoints:
        sql<number>`coalesce(sum(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "total_points",
        ),
      bestGameweekPoints:
        sql<number>`coalesce(max(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "best_gw",
        ),
    })
    .from(managerMatchdayScores)
    .innerJoin(matchdays, eq(managerMatchdayScores.matchdayId, matchdays.id))
    .where(
      and(
        eq(managerMatchdayScores.seasonId, seasonId),
        eq(matchdays.status, "published"),
      ),
    )
    .groupBy(managerMatchdayScores.managerId)
    .as("manager_totals");

  const latestPublished = await db
    .select({ id: matchdays.id, number: matchdays.number })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number))
    .limit(1);

  const lastGwPoints = db
    .select({
      managerId: managerMatchdayScores.managerId,
      points: managerMatchdayScores.totalPoints,
    })
    .from(managerMatchdayScores)
    .where(
      latestPublished[0]
        ? eq(managerMatchdayScores.matchdayId, latestPublished[0].id)
        : sql`false`,
    )
    .as("last_gw");

  const rows = await db
    .select({
      managerId: users.id,
      displayName: users.displayName,
      totalPoints: totals.totalPoints,
      bestGameweekPoints: totals.bestGameweekPoints,
      lastGameweekPoints: sql<number>`coalesce(${lastGwPoints.points}, 0)::int`,
    })
    .from(users)
    .innerJoin(totals, eq(users.id, totals.managerId))
    .leftJoin(lastGwPoints, eq(users.id, lastGwPoints.managerId))
    .where(inArray(users.role, ["manager", "admin"]));

  const sorted = rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.bestGameweekPoints !== a.bestGameweekPoints) {
      return b.bestGameweekPoints - a.bestGameweekPoints;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const priorMd = latestPublished[0]
    ? (
        await db
          .select({ id: matchdays.id })
          .from(matchdays)
          .where(
            and(
              eq(matchdays.seasonId, seasonId),
              eq(matchdays.status, "published"),
              sql`${matchdays.number} = ${latestPublished[0]!.number - 1}`,
            ),
          )
          .limit(1)
      )[0]
    : undefined;

  let rankBefore = new Map<string, number>();
  if (priorMd) {
    const snaps = await db
      .select({
        managerId: managerRankSnapshots.managerId,
        rankAfter: managerRankSnapshots.rankAfter,
      })
      .from(managerRankSnapshots)
      .where(eq(managerRankSnapshots.matchdayId, priorMd.id));
    rankBefore = new Map(snaps.map((s) => [s.managerId, s.rankAfter]));
  }

  return sorted.map((row, index) => {
    const rank = index + 1;
    const before = rankBefore.get(row.managerId);
    const rankDelta = before !== undefined ? before - rank : 0;
    return {
      managerId: row.managerId,
      displayName: row.displayName,
      rank,
      rankDelta,
      totalPoints: row.totalPoints,
      bestGameweekPoints: row.bestGameweekPoints,
      lastGameweekPoints: row.lastGameweekPoints,
    };
  });
}
