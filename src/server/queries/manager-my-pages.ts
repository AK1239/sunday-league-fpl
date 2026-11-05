import { and, desc, eq, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  managerMatchdayScores,
  managerRankSnapshots,
  managerScoreLines,
  matchdays,
  players,
  seasons,
} from "@/server/db/schema";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import {
  getManagerFantasyTeamForViewer,
  getNextScheduledMatchday,
  type FantasyTeamView,
} from "./fantasy-team-view";

export type MyGameweekScoreRow = {
  matchdayId: string;
  number: number;
  playedOn: string;
  totalPoints: number;
  rankAfter: number | null;
  teamSource: string;
};

export type MyScoreLineRow = {
  playerId: string;
  playerName: string;
  role: string;
  basePoints: number;
  multiplier: number;
  points: number;
  attended: boolean;
};

export type CaptainGameweekRow = {
  matchdayId: string;
  number: number;
  playedOn: string;
  captainBonusPoints: number;
  multiplierPlayerName: string | null;
};

export type MyTeamPageData = {
  seasonId: string;
  seasonName: string;
  seasonTotalPoints: number;
  upcoming: {
    matchdayId: string;
    number: number;
    playedOn: string;
    deadlineAt: Date;
    team: FantasyTeamView;
  } | null;
  latestPublished: {
    matchdayId: string;
    number: number;
    playedOn: string;
    totalPoints: number | null;
    team: FantasyTeamView;
  } | null;
};

export async function getMyTeamPageData(
  db: AppDb,
  managerId: string,
): Promise<MyTeamPageData | null> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const [season] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const [{ total }] = await db
    .select({
      total: sql<number>`coalesce(sum(${managerMatchdayScores.totalPoints}), 0)::int`,
    })
    .from(managerMatchdayScores)
    .innerJoin(matchdays, eq(managerMatchdayScores.matchdayId, matchdays.id))
    .where(
      and(
        eq(managerMatchdayScores.managerId, managerId),
        eq(matchdays.seasonId, seasonId),
        eq(matchdays.status, "published"),
      ),
    );

  const upcomingMd = await getNextScheduledMatchday(db, seasonId);
  let upcoming = null;
  if (upcomingMd) {
    const team = await getManagerFantasyTeamForViewer(
      db,
      upcomingMd.id,
      managerId,
      {
        viewerUserId: managerId,
        viewerRole: "manager",
        targetManagerId: managerId,
      },
    );
    upcoming = {
      matchdayId: upcomingMd.id,
      number: upcomingMd.number,
      playedOn: upcomingMd.playedOn,
      deadlineAt: upcomingMd.deadlineAt,
      team,
    };
  }

  const [latestMd] = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
    })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number))
    .limit(1);

  let latestPublished = null;
  if (latestMd) {
    const [score] = await db
      .select({ totalPoints: managerMatchdayScores.totalPoints })
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, latestMd.id),
        ),
      )
      .limit(1);

    const team = await getManagerFantasyTeamForViewer(
      db,
      latestMd.id,
      managerId,
      {
        viewerUserId: managerId,
        viewerRole: "manager",
        targetManagerId: managerId,
      },
    );

    latestPublished = {
      matchdayId: latestMd.id,
      number: latestMd.number,
      playedOn: latestMd.playedOn,
      totalPoints: score?.totalPoints ?? null,
      team,
    };
  }

  return {
    seasonId,
    seasonName: season?.name ?? "Season",
    seasonTotalPoints: total ?? 0,
    upcoming,
    latestPublished,
  };
}

export async function getMyPointsGameweeks(
  db: AppDb,
  managerId: string,
  seasonId: string,
): Promise<MyGameweekScoreRow[]> {
  const rows = await db
    .select({
      matchdayId: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      totalPoints: managerMatchdayScores.totalPoints,
      teamSource: managerMatchdayScores.teamSource,
      rankAfter: managerRankSnapshots.rankAfter,
    })
    .from(matchdays)
    .leftJoin(
      managerMatchdayScores,
      and(
        eq(managerMatchdayScores.matchdayId, matchdays.id),
        eq(managerMatchdayScores.managerId, managerId),
      ),
    )
    .leftJoin(
      managerRankSnapshots,
      and(
        eq(managerRankSnapshots.matchdayId, matchdays.id),
        eq(managerRankSnapshots.managerId, managerId),
      ),
    )
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number));

  return rows.map((row) => ({
    matchdayId: row.matchdayId,
    number: row.number,
    playedOn: row.playedOn,
    totalPoints: row.totalPoints ?? 0,
    rankAfter: row.rankAfter ?? null,
    teamSource: row.teamSource ?? "none",
  }));
}

export async function getMyGameweekDetail(
  db: AppDb,
  managerId: string,
  matchdayId: string,
): Promise<{
  matchday: { id: string; number: number; playedOn: string };
  totalPoints: number;
  teamSource: string;
  lines: MyScoreLineRow[];
} | null> {
  const [md] = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  if (!md || md.status !== "published") return null;

  const [score] = await db
    .select({
      totalPoints: managerMatchdayScores.totalPoints,
      teamSource: managerMatchdayScores.teamSource,
    })
    .from(managerMatchdayScores)
    .where(
      and(
        eq(managerMatchdayScores.managerId, managerId),
        eq(managerMatchdayScores.matchdayId, matchdayId),
      ),
    )
    .limit(1);

  const lineRows = await db
    .select({
      playerId: managerScoreLines.playerId,
      playerName: players.displayName,
      role: managerScoreLines.role,
      basePoints: managerScoreLines.basePoints,
      multiplier: managerScoreLines.multiplier,
      points: managerScoreLines.points,
      attended: managerScoreLines.attended,
    })
    .from(managerScoreLines)
    .innerJoin(players, eq(managerScoreLines.playerId, players.id))
    .where(
      and(
        eq(managerScoreLines.managerId, managerId),
        eq(managerScoreLines.matchdayId, matchdayId),
      ),
    )
    .orderBy(desc(managerScoreLines.points));

  return {
    matchday: { id: md.id, number: md.number, playedOn: md.playedOn },
    totalPoints: score?.totalPoints ?? 0,
    teamSource: score?.teamSource ?? "none",
    lines: lineRows,
  };
}

export async function getMyCaptainPerformance(
  db: AppDb,
  managerId: string,
  seasonId: string,
): Promise<{ seasonBonus: number; gameweeks: CaptainGameweekRow[] }> {
  const published = await db
    .select({ id: matchdays.id, number: matchdays.number, playedOn: matchdays.playedOn })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number));

  const gameweeks: CaptainGameweekRow[] = [];
  let seasonBonus = 0;

  for (const md of published) {
    const lines = await db
      .select({
        basePoints: managerScoreLines.basePoints,
        multiplier: managerScoreLines.multiplier,
        points: managerScoreLines.points,
        playerName: players.displayName,
      })
      .from(managerScoreLines)
      .innerJoin(players, eq(managerScoreLines.playerId, players.id))
      .where(
        and(
          eq(managerScoreLines.managerId, managerId),
          eq(managerScoreLines.matchdayId, md.id),
          sql`${managerScoreLines.multiplier} > 1`,
        ),
      );

    const bonus = lines.reduce(
      (sum, line) => sum + (line.points - line.basePoints),
      0,
    );
    seasonBonus += bonus;
    gameweeks.push({
      matchdayId: md.id,
      number: md.number,
      playedOn: md.playedOn,
      captainBonusPoints: bonus,
      multiplierPlayerName: lines[0]?.playerName ?? null,
    });
  }

  return { seasonBonus, gameweeks };
}

export async function getMyHistoricalTeams(
  db: AppDb,
  managerId: string,
  seasonId: string,
): Promise<
  {
    matchdayId: string;
    number: number;
    playedOn: string;
    totalPoints: number;
    team: FantasyTeamView;
  }[]
> {
  const published = await db
    .select({ id: matchdays.id, number: matchdays.number, playedOn: matchdays.playedOn })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number));

  const result = [];
  for (const md of published) {
    const [score] = await db
      .select({ totalPoints: managerMatchdayScores.totalPoints })
      .from(managerMatchdayScores)
      .where(
        and(
          eq(managerMatchdayScores.managerId, managerId),
          eq(managerMatchdayScores.matchdayId, md.id),
        ),
      )
      .limit(1);

    const team = await getManagerFantasyTeamForViewer(db, md.id, managerId, {
      viewerUserId: managerId,
      viewerRole: "manager",
      targetManagerId: managerId,
    });

    result.push({
      matchdayId: md.id,
      number: md.number,
      playedOn: md.playedOn,
      totalPoints: score?.totalPoints ?? 0,
      team,
    });
  }

  return result;
}

export async function getManagerMySeasonId(db: AppDb): Promise<string | null> {
  return getActiveSeasonId(db);
}
