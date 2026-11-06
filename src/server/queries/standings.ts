import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  goals,
  matchParticipants,
  matchSides,
  matchdayAttendance,
  matchdaySnapshots,
  matchdays,
  matches,
  players,
  pointLedger,
} from "@/server/db/schema";

export type StandingsSort =
  "points" | "goals" | "assists" | "appearances" | "average";

export type StandingRow = {
  playerId: string;
  displayName: string;
  nickname: string | null;
  kitKey: string | null;
  avatarUrl: string | null;
  rank: number;
  rankDelta: number;
  points: number;
  goals: number;
  assists: number;
  appearances: number;
  wins: number;
  averagePoints: number;
};

function publishedMatchdayFilter(seasonId: string | null) {
  return seasonId
    ? and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published"))
    : eq(matchdays.status, "published");
}

export async function getAllTimeStandings(
  db: AppDb,
  sort: StandingsSort = "points",
): Promise<StandingRow[]> {
  return getStandings(db, null, sort);
}

export async function getStandings(
  db: AppDb,
  seasonId: string | null,
  sort: StandingsSort = "points",
): Promise<StandingRow[]> {
  const pointsTotals = db
    .select({
      playerId: pointLedger.playerId,
      points: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`.as(
        "points",
      ),
    })
    .from(pointLedger)
    .where(seasonId ? eq(pointLedger.seasonId, seasonId) : sql`true`)
    .groupBy(pointLedger.playerId)
    .as("points_totals");

  const goalTotals = db
    .select({
      playerId: goals.scorerId,
      goals: sql<number>`count(*)::int`.as("goals"),
    })
    .from(goals)
    .innerJoin(matches, eq(goals.matchId, matches.id))
    .innerJoin(matchdays, eq(matches.matchdayId, matchdays.id))
    .where(
      and(
        publishedMatchdayFilter(seasonId),
        // Own goals count for the other team, not the scorer.
        ne(goals.kind, "own_goal"),
      ),
    )
    .groupBy(goals.scorerId)
    .as("goal_totals");

  const assistTotals = db
    .select({
      playerId: goals.assistId,
      assists: sql<number>`count(*)::int`.as("assists"),
    })
    .from(goals)
    .innerJoin(matches, eq(goals.matchId, matches.id))
    .innerJoin(matchdays, eq(matches.matchdayId, matchdays.id))
    .where(
      and(
        publishedMatchdayFilter(seasonId),
        sql`${goals.assistId} is not null`,
      ),
    )
    .groupBy(goals.assistId)
    .as("assist_totals");

  const appearanceTotals = db
    .select({
      playerId: matchdayAttendance.playerId,
      appearances:
        sql<number>`count(distinct ${matchdayAttendance.matchdayId})::int`.as(
          "appearances",
        ),
    })
    .from(matchdayAttendance)
    .innerJoin(matchdays, eq(matchdayAttendance.matchdayId, matchdays.id))
    .where(publishedMatchdayFilter(seasonId))
    .groupBy(matchdayAttendance.playerId)
    .as("appearance_totals");

  const winTotals = db
    .select({
      playerId: matchParticipants.playerId,
      wins: sql<number>`count(distinct ${matches.id})::int`.as("wins"),
    })
    .from(matchParticipants)
    .innerJoin(matchSides, eq(matchParticipants.sideId, matchSides.id))
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .innerJoin(matchdays, eq(matches.matchdayId, matchdays.id))
    .where(
      and(
        publishedMatchdayFilter(seasonId),
        sql`(
          (${matchSides.side} = 'A' and ${matches.scoreA} > ${matches.scoreB}) or
          (${matchSides.side} = 'B' and ${matches.scoreB} > ${matches.scoreA})
        )`,
      ),
    )
    .groupBy(matchParticipants.playerId)
    .as("win_totals");

  const baseRows = await db
    .select({
      playerId: players.id,
      displayName: players.displayName,
      nickname: players.nickname,
      kitKey: players.kitKey,
      avatarUrl: players.avatarUrl,
      points: sql<number>`coalesce(${pointsTotals.points}, 0)`.mapWith(Number),
      goals: sql<number>`coalesce(${goalTotals.goals}, 0)`.mapWith(Number),
      assists: sql<number>`coalesce(${assistTotals.assists}, 0)`.mapWith(
        Number,
      ),
      appearances:
        sql<number>`coalesce(${appearanceTotals.appearances}, 0)`.mapWith(
          Number,
        ),
      wins: sql<number>`coalesce(${winTotals.wins}, 0)`.mapWith(Number),
    })
    .from(players)
    .leftJoin(pointsTotals, eq(players.id, pointsTotals.playerId))
    .leftJoin(goalTotals, eq(players.id, goalTotals.playerId))
    .leftJoin(assistTotals, eq(players.id, assistTotals.playerId))
    .leftJoin(appearanceTotals, eq(players.id, appearanceTotals.playerId))
    .leftJoin(winTotals, eq(players.id, winTotals.playerId))
    .where(
      and(
        eq(players.active, true),
        sql`coalesce(${pointsTotals.points}, 0) > 0`,
      ),
    );

  const withAverage = baseRows.map((row) => ({
    ...row,
    averagePoints:
      row.appearances > 0
        ? Math.round((row.points / row.appearances) * 10) / 10
        : 0,
  }));

  const sorted = [...withAverage].sort((a, b) => compareForSort(a, b, sort));

  let latestRank = new Map<string, number>();
  let previousRank = new Map<string, number>();

  if (seasonId) {
    const latestPublished = await db
      .select({ id: matchdays.id, number: matchdays.number })
      .from(matchdays)
      .where(publishedMatchdayFilter(seasonId))
      .orderBy(desc(matchdays.number))
      .limit(1);

    const previousPublished =
      latestPublished[0] &&
      (await db
        .select({ id: matchdays.id })
        .from(matchdays)
        .where(
          and(
            publishedMatchdayFilter(seasonId),
            sql`${matchdays.number} = ${latestPublished[0].number - 1}`,
          ),
        )
        .limit(1));

    const latestSnapshots =
      latestPublished[0] &&
      (await db
        .select()
        .from(matchdaySnapshots)
        .where(eq(matchdaySnapshots.matchdayId, latestPublished[0].id)));

    const previousSnapshots =
      previousPublished?.[0] &&
      (await db
        .select()
        .from(matchdaySnapshots)
        .where(eq(matchdaySnapshots.matchdayId, previousPublished[0].id)));

    latestRank = new Map(
      latestSnapshots
        ? latestSnapshots.map((row) => [row.playerId, row.rankAfter])
        : [],
    );
    previousRank = new Map(
      previousSnapshots
        ? previousSnapshots.map((row) => [row.playerId, row.rankAfter])
        : [],
    );
  }

  return sorted.map((row, index) => {
    const rank = index + 1;
    const prev = previousRank.get(row.playerId);
    const curr = latestRank.get(row.playerId);
    const rankDelta =
      prev !== undefined && curr !== undefined ? prev - curr : 0;

    return {
      playerId: row.playerId,
      displayName: row.displayName,
      nickname: row.nickname,
      kitKey: row.kitKey,
      avatarUrl: row.avatarUrl,
      rank,
      rankDelta,
      points: row.points,
      goals: row.goals,
      assists: row.assists,
      appearances: row.appearances,
      wins: row.wins,
      averagePoints: row.averagePoints,
    };
  });
}

function compareForSort(
  a: {
    points: number;
    goals: number;
    assists: number;
    appearances: number;
    averagePoints: number;
    displayName: string;
  },
  b: typeof a,
  sort: StandingsSort,
): number {
  if (sort === "goals") {
    return b.goals - a.goals || b.points - a.points;
  }
  if (sort === "assists") {
    return b.assists - a.assists || b.points - a.points;
  }
  if (sort === "appearances") {
    return b.appearances - a.appearances || b.points - a.points;
  }
  if (sort === "average") {
    return b.averagePoints - a.averagePoints || b.points - a.points;
  }
  return (
    b.points - a.points ||
    b.goals - a.goals ||
    b.assists - a.assists ||
    a.appearances - b.appearances ||
    a.displayName.localeCompare(b.displayName)
  );
}

export async function getLatestPublishedMatchdayId(
  db: AppDb,
  seasonId: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: matchdays.id })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number))
    .limit(1);
  return rows[0]?.id ?? null;
}
