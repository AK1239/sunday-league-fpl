import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  managerMatchdayScores,
  managerRankSnapshots,
  matchMvps,
  matchdays,
  matches,
  players,
  seasons,
  users,
} from "@/server/db/schema";
import { ensureAutoScheduledMatchday } from "@/server/domain/auto-schedule-matchdays";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import {
  getManagerFantasyTeamForViewer,
  getNextScheduledMatchday,
} from "./fantasy-team-view";
import {
  getManagerStandings,
  type ManagerStandingRow,
} from "./manager-standings";
import { getStandings } from "./standings";

export type PublicMatchSummary = {
  id: string;
  matchNo: number;
  scoreA: number;
  scoreB: number;
};

export type PublicMatchdayListItem = {
  id: string;
  number: number;
  playedOn: string;
  status: string;
};

export type ManagerGameweekRankRow = {
  managerId: string;
  displayName: string;
  totalPoints: number;
  rank: number;
};

export type PublicHomeData = {
  seasonId: string;
  seasonName: string;
  managerStandings: ManagerStandingRow[];
  nextMatchday: {
    id: string;
    number: number;
    playedOn: string;
    deadlineAt: Date;
  } | null;
  latestPublished: {
    id: string;
    number: number;
    playedOn: string;
    matches: PublicMatchSummary[];
    topManager: ManagerGameweekRankRow | null;
    mvpPlayer: { id: string; displayName: string } | null;
  } | null;
  goldenBoot: { playerId: string; displayName: string; goals: number } | null;
  playmaker: { playerId: string; displayName: string; assists: number } | null;
};

export async function getPublicHomeData(db: AppDb): Promise<PublicHomeData | null> {
  await ensureAutoScheduledMatchday(db);
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const [season] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const managerStandings = await getManagerStandings(db, seasonId);
  const nextMd = await getNextScheduledMatchday(db, seasonId);

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

  let latestPublished: PublicHomeData["latestPublished"] = null;

  if (latestMd) {
    const matchRows = await db
      .select({
        id: matches.id,
        matchNo: matches.matchNo,
        scoreA: matches.scoreA,
        scoreB: matches.scoreB,
      })
      .from(matches)
      .where(eq(matches.matchdayId, latestMd.id))
      .orderBy(asc(matches.matchNo));

    const ranking = await getManagerGameweekRanking(db, latestMd.id);
    const mvp = await getMatchdayMvp(db, latestMd.id);

    latestPublished = {
      id: latestMd.id,
      number: latestMd.number,
      playedOn: latestMd.playedOn,
      matches: matchRows,
      topManager: ranking[0] ?? null,
      mvpPlayer: mvp
        ? { id: mvp.playerId, displayName: mvp.displayName }
        : null,
    };
  }

  const playerStandings = await getStandings(db, seasonId, "goals");
  const goldenBootPlayer = playerStandings[0];
  const assistStandings = await getStandings(db, seasonId, "assists");
  const playmakerPlayer = assistStandings[0];

  return {
    seasonId,
    seasonName: season?.name ?? "Season",
    managerStandings,
    nextMatchday: nextMd
      ? {
          id: nextMd.id,
          number: nextMd.number,
          playedOn: nextMd.playedOn,
          deadlineAt: nextMd.deadlineAt,
        }
      : null,
    latestPublished,
    goldenBoot: goldenBootPlayer
      ? {
          playerId: goldenBootPlayer.playerId,
          displayName: goldenBootPlayer.displayName,
          goals: goldenBootPlayer.goals,
        }
      : null,
    playmaker: playmakerPlayer
      ? {
          playerId: playmakerPlayer.playerId,
          displayName: playmakerPlayer.displayName,
          assists: playmakerPlayer.assists,
        }
      : null,
  };
}

async function getMatchdayMvp(db: AppDb, matchdayId: string) {
  const rows = await db
    .select({
      playerId: players.id,
      displayName: players.displayName,
    })
    .from(matchMvps)
    .innerJoin(matches, eq(matchMvps.matchId, matches.id))
    .innerJoin(players, eq(matchMvps.playerId, players.id))
    .where(eq(matches.matchdayId, matchdayId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublicMatchdays(
  db: AppDb,
  seasonId: string,
): Promise<PublicMatchdayListItem[]> {
  return db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        sql`${matchdays.status} in ('scheduled', 'draft', 'published')`,
      ),
    )
    .orderBy(desc(matchdays.number));
}

export async function getManagerGameweekRanking(
  db: AppDb,
  matchdayId: string,
): Promise<ManagerGameweekRankRow[]> {
  const rows = await db
    .select({
      managerId: users.id,
      displayName: users.displayName,
      totalPoints: managerMatchdayScores.totalPoints,
    })
    .from(managerMatchdayScores)
    .innerJoin(users, eq(managerMatchdayScores.managerId, users.id))
    .where(eq(managerMatchdayScores.matchdayId, matchdayId))
    .orderBy(desc(managerMatchdayScores.totalPoints), asc(users.displayName));

  return rows.map((row, index) => ({
    managerId: row.managerId,
    displayName: row.displayName,
    totalPoints: row.totalPoints,
    rank: index + 1,
  }));
}

export async function getPublicMatchdayDetail(
  db: AppDb,
  matchdayId: string,
): Promise<{
  matchday: {
    id: string;
    number: number;
    playedOn: string;
    status: string;
    seasonId: string;
  };
  matches: PublicMatchSummary[];
  managerRanking: ManagerGameweekRankRow[];
} | null> {
  const [md] = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      status: matchdays.status,
      seasonId: matchdays.seasonId,
    })
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  if (!md) return null;

  const matchRows = await db
    .select({
      id: matches.id,
      matchNo: matches.matchNo,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
    })
    .from(matches)
    .where(eq(matches.matchdayId, matchdayId))
    .orderBy(asc(matches.matchNo));

  const managerRanking =
    md.status === "published"
      ? await getManagerGameweekRanking(db, matchdayId)
      : [];

  return {
    matchday: md,
    matches: matchRows,
    managerRanking,
  };
}

export type PublicManagerProfile = {
  managerId: string;
  displayName: string;
  seasonId: string;
  seasonName: string;
  standing: ManagerStandingRow | null;
  gameweeks: {
    matchdayId: string;
    number: number;
    playedOn: string;
    totalPoints: number;
    rankAfter: number | null;
  }[];
};

export async function getPublicManagerProfile(
  db: AppDb,
  managerId: string,
): Promise<PublicManagerProfile | null> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const [manager] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, managerId))
    .limit(1);

  if (!manager) return null;

  const [season] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const standings = await getManagerStandings(db, seasonId);
  const standing = standings.find((s) => s.managerId === managerId) ?? null;

  const gwRows = await db
    .select({
      matchdayId: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      totalPoints: managerMatchdayScores.totalPoints,
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

  return {
    managerId: manager.id,
    displayName: manager.displayName,
    seasonId,
    seasonName: season?.name ?? "Season",
    standing,
    gameweeks: gwRows.map((row) => ({
      matchdayId: row.matchdayId,
      number: row.number,
      playedOn: row.playedOn,
      totalPoints: row.totalPoints ?? 0,
      rankAfter: row.rankAfter ?? null,
    })),
  };
}

export async function getPublicManagerTeamForGameweek(
  db: AppDb,
  managerId: string,
  matchdayId: string,
) {
  return getManagerFantasyTeamForViewer(db, matchdayId, managerId, {
    viewerUserId: null,
    viewerRole: null,
    targetManagerId: managerId,
  });
}

export { getActiveSeasonId };
