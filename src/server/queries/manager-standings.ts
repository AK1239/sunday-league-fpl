import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
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

export type StandingsOptions = {
  /**
   * Also list active managers who have no published score yet (0 pts), so the
   * table shows everyone who has joined. Leave off for awards and anything
   * that picks a winner.
   */
  includeUnscored?: boolean;
};

const unscoredWhere = (
  role: typeof users.role,
  hasScores: ReturnType<typeof isNotNull>,
) => or(eq(role, "manager"), hasScores);

/** Competition ranking: managers level on points and best GW share a rank. */
function rankWithTies<
  T extends { totalPoints: number; bestGameweekPoints: number },
>(sorted: T[]): number[] {
  const ranks: number[] = [];
  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    ranks.push(
      prev &&
        prev.totalPoints === row.totalPoints &&
        prev.bestGameweekPoints === row.bestGameweekPoints
        ? ranks[i - 1]!
        : i + 1,
    );
  });
  return ranks;
}

export async function getManagerStandings(
  db: AppDb,
  seasonId: string,
  options: StandingsOptions = {},
): Promise<ManagerStandingRow[]> {
  const includeUnscored = options.includeUnscored === true;
  const totals = db
    .select({
      managerId: managerMatchdayScores.managerId,
      totalPoints:
        sql<number>`coalesce(sum(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "mgr_season_total_pts",
        ),
      bestGameweekPoints:
        sql<number>`coalesce(max(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "mgr_best_gw_pts",
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
      lastGwPoints: sql<number>`${managerMatchdayScores.totalPoints}`.as(
        "mgr_last_gw_pts",
      ),
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
      // Public label: team name when set, otherwise the manager's own name.
      displayName: sql<string>`coalesce(${users.teamName}, ${users.displayName})`,
      totalPoints: sql<number>`coalesce(${totals.totalPoints}, 0)::int`,
      bestGameweekPoints: sql<number>`coalesce(${totals.bestGameweekPoints}, 0)::int`,
      lastGameweekPoints: sql<number>`coalesce(${lastGwPoints.lastGwPoints}, 0)::int`,
    })
    .from(users)
    .leftJoin(totals, eq(users.id, totals.managerId))
    .leftJoin(lastGwPoints, eq(users.id, lastGwPoints.managerId))
    .where(
      and(
        inArray(users.role, ["manager", "admin"]),
        eq(users.status, "active"),
        includeUnscored
          ? unscoredWhere(users.role, isNotNull(totals.managerId))
          : isNotNull(totals.managerId),
      ),
    );

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

  const ranks = includeUnscored ? rankWithTies(sorted) : null;

  return sorted.map((row, index) => {
    const rank = ranks ? ranks[index]! : index + 1;
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

export async function getAllTimeManagerStandings(
  db: AppDb,
  options: StandingsOptions = {},
): Promise<ManagerStandingRow[]> {
  const includeUnscored = options.includeUnscored === true;
  const totals = db
    .select({
      managerId: managerMatchdayScores.managerId,
      totalPoints:
        sql<number>`coalesce(sum(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "mgr_alltime_total_pts",
        ),
      bestGameweekPoints:
        sql<number>`coalesce(max(${managerMatchdayScores.totalPoints}), 0)::int`.as(
          "mgr_alltime_best_gw_pts",
        ),
    })
    .from(managerMatchdayScores)
    .innerJoin(matchdays, eq(managerMatchdayScores.matchdayId, matchdays.id))
    .where(eq(matchdays.status, "published"))
    .groupBy(managerMatchdayScores.managerId)
    .as("manager_totals");

  const rows = await db
    .select({
      managerId: users.id,
      // Public label: team name when set, otherwise the manager's own name.
      displayName: sql<string>`coalesce(${users.teamName}, ${users.displayName})`,
      totalPoints: sql<number>`coalesce(${totals.totalPoints}, 0)::int`,
      bestGameweekPoints: sql<number>`coalesce(${totals.bestGameweekPoints}, 0)::int`,
    })
    .from(users)
    .leftJoin(totals, eq(users.id, totals.managerId))
    .where(
      and(
        inArray(users.role, ["manager", "admin"]),
        eq(users.status, "active"),
        includeUnscored
          ? unscoredWhere(users.role, isNotNull(totals.managerId))
          : isNotNull(totals.managerId),
      ),
    );

  const sorted = rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.bestGameweekPoints !== a.bestGameweekPoints) {
      return b.bestGameweekPoints - a.bestGameweekPoints;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const ranks = includeUnscored ? rankWithTies(sorted) : null;

  return sorted.map((row, index) => ({
    managerId: row.managerId,
    displayName: row.displayName,
    rank: ranks ? ranks[index]! : index + 1,
    rankDelta: 0,
    totalPoints: row.totalPoints,
    bestGameweekPoints: row.bestGameweekPoints,
    lastGameweekPoints: 0,
  }));
}
