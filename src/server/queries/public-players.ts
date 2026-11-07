import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  goals,
  matchIncidents,
  matchMvps,
  matchdays,
  matches,
  matchParticipants,
  matchSides,
  players,
  pointLedger,
  seasons,
} from "@/server/db/schema";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import { loadScoringRulesForMatchday } from "@/server/domain/load-matchday-scoring";
import { fantasyMultiplierFromDb } from "@/server/scoring/chip-effects";
import { getStandings } from "./standings";
import { getLatestPublishedMatchdayId } from "./standings";

export type PlayerPublicProfile = {
  player: {
    id: string;
    displayName: string;
    nickname: string | null;
    kitKey: string | null;
    avatarUrl: string | null;
    joinedOn: string | null;
  };
  rank: number;
  points: number;
  goals: number;
  assists: number;
  appearances: number;
  wins: number;
  winRate: number;
  averagePoints: number;
  mvpCount: number;
  form: number[];
  recentMatchdays: {
    matchdayId: string;
    number: number;
    playedOn: string;
    points: number;
  }[];
  pickedByManagers: number | null;
};

export async function getPlayerPublicProfile(
  db: AppDb,
  playerId: string,
): Promise<PlayerPublicProfile | null> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (!player) return null;

  const standings = await getStandings(db, seasonId, "points");
  const row = standings.find((s) => s.playerId === playerId);

  const recentPublished = await db
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
    .limit(8);

  const publishedIds = recentPublished.map((m) => m.id);
  const formPublished = [...recentPublished].reverse();

  const form: number[] = [];
  const recentMatchdays: PlayerPublicProfile["recentMatchdays"] = [];

  if (publishedIds.length > 0) {
    const ledgerRows = await db
      .select({
        matchdayId: pointLedger.matchdayId,
        points: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`.as(
          "points",
        ),
      })
      .from(pointLedger)
      .where(
        and(
          eq(pointLedger.playerId, playerId),
          inArray(pointLedger.matchdayId, publishedIds),
        ),
      )
      .groupBy(pointLedger.matchdayId);

    const pointsByMd = new Map(ledgerRows.map((r) => [r.matchdayId, r.points]));

    for (const md of formPublished) {
      form.push(pointsByMd.get(md.id) ?? 0);
    }

    for (const md of recentPublished) {
      recentMatchdays.push({
        matchdayId: md.id,
        number: md.number,
        playedOn: md.playedOn,
        points: pointsByMd.get(md.id) ?? 0,
      });
    }
  }

  const [{ count: mvpCount }] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(matchMvps)
    .innerJoin(matches, eq(matchMvps.matchId, matches.id))
    .innerJoin(matchdays, eq(matches.matchdayId, matchdays.id))
    .where(
      and(
        eq(matchMvps.playerId, playerId),
        eq(matchdays.seasonId, seasonId),
        eq(matchdays.status, "published"),
      ),
    );

  let pickedByManagers: number | null = null;
  const latestMdId = await getLatestPublishedMatchdayId(db, seasonId);
  if (latestMdId) {
    const [{ count }] = await db
      .select({
        count: sql<number>`count(distinct ${fantasyTeams.managerId})::int`,
      })
      .from(fantasyTeamPlayers)
      .innerJoin(
        fantasyTeams,
        eq(fantasyTeamPlayers.fantasyTeamId, fantasyTeams.id),
      )
      .where(
        and(
          eq(fantasyTeams.matchdayId, latestMdId),
          eq(fantasyTeamPlayers.playerId, playerId),
        ),
      );
    pickedByManagers = count;
  }

  const appearances = row?.appearances ?? 0;
  const wins = row?.wins ?? 0;

  return {
    player: {
      id: player.id,
      displayName: player.displayName,
      nickname: player.nickname,
      kitKey: player.kitKey,
      avatarUrl: player.avatarUrl,
      joinedOn: player.joinedOn,
    },
    rank: row?.rank ?? standings.length + 1,
    points: row?.points ?? 0,
    goals: row?.goals ?? 0,
    assists: row?.assists ?? 0,
    appearances,
    wins,
    winRate: appearances > 0 ? Math.round((wins / appearances) * 100) : 0,
    averagePoints: row?.averagePoints ?? 0,
    mvpCount: mvpCount ?? 0,
    form: form.length > 0 ? form : [],
    recentMatchdays,
    pickedByManagers,
  };
}

export type PublicMatchDetail = {
  match: {
    id: string;
    matchNo: number;
    scoreA: number;
    scoreB: number;
    matchdayId: string;
    matchdayNumber: number;
    playedOn: string;
  };
  sideA: {
    playerIds: string[];
    playerNames: string[];
    players: { id: string; name: string; kitKey: string | null }[];
    goalkeeperName: string | null;
  };
  sideB: {
    playerIds: string[];
    playerNames: string[];
    players: { id: string; name: string; kitKey: string | null }[];
    goalkeeperName: string | null;
  };
  goals: {
    side: "A" | "B";
    scorerName: string;
    assistName: string | null;
    kind: "open_play" | "penalty" | "own_goal";
  }[];
  incidents: {
    side: "A" | "B";
    playerName: string;
    kind: "penalty_saved" | "handball_blocked" | "penalty_missed";
  }[];
  mvpPlayerName: string | null;
};

export async function getPublicMatchDetail(
  db: AppDb,
  matchId: string,
): Promise<PublicMatchDetail | null> {
  const [matchRow] = await db
    .select({
      id: matches.id,
      matchNo: matches.matchNo,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
      matchdayId: matches.matchdayId,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      status: matchdays.status,
    })
    .from(matches)
    .innerJoin(matchdays, eq(matches.matchdayId, matchdays.id))
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!matchRow || matchRow.status !== "published") return null;

  const sideRows = await db
    .select({
      id: matchSides.id,
      side: matchSides.side,
      goalkeeperPlayerId: matchSides.goalkeeperPlayerId,
    })
    .from(matchSides)
    .where(eq(matchSides.matchId, matchId));

  const sideA = sideRows.find((s) => s.side === "A");
  const sideB = sideRows.find((s) => s.side === "B");

  const participants = await db
    .select({
      playerId: matchParticipants.playerId,
      sideId: matchParticipants.sideId,
      displayName: players.displayName,
      kitKey: players.kitKey,
    })
    .from(matchParticipants)
    .innerJoin(players, eq(matchParticipants.playerId, players.id))
    .where(eq(matchParticipants.matchId, matchId));

  const gkNames = new Map<string, string>();
  for (const sid of [sideA, sideB]) {
    if (sid?.goalkeeperPlayerId) {
      const gk = participants.find(
        (p) => p.playerId === sid.goalkeeperPlayerId,
      );
      if (gk) gkNames.set(sid.side, gk.displayName);
    }
  }

  function sidePlayers(sideId: string | undefined) {
    if (!sideId) {
      return {
        playerIds: [] as string[],
        playerNames: [] as string[],
        players: [] as { id: string; name: string; kitKey: string | null }[],
      };
    }
    const list = participants.filter((p) => p.sideId === sideId);
    return {
      playerIds: list.map((p) => p.playerId),
      playerNames: list.map((p) => p.displayName),
      players: list.map((p) => ({
        id: p.playerId,
        name: p.displayName,
        kitKey: p.kitKey,
      })),
    };
  }

  const goalRows = await db
    .select({
      side: matchSides.side,
      scorerName: players.displayName,
      assistId: goals.assistId,
      kind: goals.kind,
    })
    .from(goals)
    .innerJoin(matchSides, eq(goals.sideId, matchSides.id))
    .innerJoin(players, eq(goals.scorerId, players.id))
    .where(eq(goals.matchId, matchId))
    .orderBy(asc(goals.seq));

  const incidentRows = await db
    .select({
      side: matchSides.side,
      playerName: players.displayName,
      kind: matchIncidents.kind,
    })
    .from(matchIncidents)
    .innerJoin(matchSides, eq(matchIncidents.sideId, matchSides.id))
    .innerJoin(players, eq(matchIncidents.playerId, players.id))
    .where(eq(matchIncidents.matchId, matchId))
    .orderBy(asc(matchIncidents.seq));

  const assistIds = goalRows
    .map((g) => g.assistId)
    .filter((id): id is string => Boolean(id));
  const assistNames = new Map<string, string>();
  if (assistIds.length > 0) {
    const assists = await db
      .select({ id: players.id, displayName: players.displayName })
      .from(players)
      .where(inArray(players.id, assistIds));
    for (const a of assists) assistNames.set(a.id, a.displayName);
  }

  const [mvp] = await db
    .select({ displayName: players.displayName })
    .from(matchMvps)
    .innerJoin(players, eq(matchMvps.playerId, players.id))
    .where(eq(matchMvps.matchId, matchId))
    .limit(1);

  return {
    match: {
      id: matchRow.id,
      matchNo: matchRow.matchNo,
      scoreA: matchRow.scoreA,
      scoreB: matchRow.scoreB,
      matchdayId: matchRow.matchdayId,
      matchdayNumber: matchRow.number,
      playedOn: matchRow.playedOn,
    },
    sideA: {
      ...sidePlayers(sideA?.id),
      goalkeeperName: gkNames.get("A") ?? null,
    },
    sideB: {
      ...sidePlayers(sideB?.id),
      goalkeeperName: gkNames.get("B") ?? null,
    },
    goals: goalRows.map((g) => ({
      side: g.side as "A" | "B",
      scorerName: g.scorerName,
      assistName: g.assistId ? (assistNames.get(g.assistId) ?? null) : null,
      kind: g.kind,
    })),
    incidents: incidentRows.map((i) => ({
      side: i.side as "A" | "B",
      playerName: i.playerName,
      kind: i.kind,
    })),
    mvpPlayerName: mvp?.displayName ?? null,
  };
}

export type SeasonRulesPublic = {
  seasonName: string;
  rules: {
    attendancePts: number;
    winPts: number;
    drawPts: number;
    goalPts: number;
    assistPts: number;
    mvpPts: number;
    cleanSheetPts: number;
    penaltyGoalPts: number;
    penaltySavedPts: number;
    ownGoalPts: number;
    handballPts: number;
    penaltyMissedPts: number;
    /** Captain × for display (e.g. 2 = double). */
    captainMultiplier: number;
    /** Vice-captain × for display (e.g. 1.5). */
    viceCaptainMultiplier: number;
  };
};

export async function getActiveSeasonRulesPublic(
  db: AppDb,
): Promise<SeasonRulesPublic | null> {
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) return null;

  const latestMd = await getLatestPublishedMatchdayId(db, seasonId);
  const mdForRules =
    latestMd ??
    (
      await db
        .select({ id: matchdays.id })
        .from(matchdays)
        .where(eq(matchdays.seasonId, seasonId))
        .orderBy(desc(matchdays.number))
        .limit(1)
    )[0]?.id;

  if (!mdForRules) return null;

  const loaded = await loadScoringRulesForMatchday(db, mdForRules);
  if (!loaded) return null;

  const [season] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const r = loaded.rules;
  return {
    seasonName: season?.name ?? "Season",
    rules: {
      attendancePts: r.attendancePts,
      winPts: r.winPts,
      drawPts: r.drawPts,
      goalPts: r.goalPts,
      assistPts: r.assistPts,
      mvpPts: r.mvpPts,
      cleanSheetPts: r.cleanSheetPts,
      penaltyGoalPts: r.penaltyGoalPts,
      penaltySavedPts: r.penaltySavedPts,
      ownGoalPts: r.ownGoalPts,
      handballPts: r.handballPts,
      penaltyMissedPts: r.penaltyMissedPts,
      captainMultiplier: fantasyMultiplierFromDb(r.captainMultiplier),
      viceCaptainMultiplier: fantasyMultiplierFromDb(r.viceCaptainMultiplier),
    },
  };
}
