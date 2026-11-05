import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  matchdayAttendance,
  matchdays,
  players,
  pointLedger,
} from "@/server/db/schema";
import { computeExpectedPoints } from "@/server/fantasy/expected-points";
import { isLocked, isSelectionOpen } from "@/server/fantasy/lock";
import type { FantasyTeamPick } from "@/server/fantasy/validate-team";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import {
  getManagerFantasyTeamForViewer,
  getNextScheduledMatchday,
} from "./fantasy-team-view";

const FORM_GW_COUNT = 5;

export type PickTeamPlayerRow = {
  id: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  form: number[];
  lastGameweekPoints: number | null;
  expectedPoints: number;
  seasonPoints: number;
  appearances: number;
};

export type PickTeamData = {
  seasonId: string;
  matchday: {
    id: string;
    number: number;
    playedOn: string;
    deadlineAt: Date;
    status: typeof matchdays.$inferSelect.status;
  };
  serverNow: Date;
  selectionOpen: boolean;
  locked: boolean;
  players: PickTeamPlayerRow[];
  myTeam: FantasyTeamPick | null;
  myTeamSource: "manual" | "admin" | "carry_over" | null;
};

async function readDbNow(db: AppDb): Promise<Date> {
  const result = await db.execute<{ now: Date }>(sql`select now() as now`);
  const row = result.rows[0];
  if (!row?.now) return new Date();
  return row.now instanceof Date ? row.now : new Date(String(row.now));
}

async function loadPlayerGameweekStats(
  db: AppDb,
  seasonId: string,
): Promise<{
  formByPlayer: Map<string, number[]>;
  lastGwByPlayer: Map<string, number>;
  seasonPointsByPlayer: Map<string, number>;
  appearancesByPlayer: Map<string, number>;
}> {
  const recentMatchdays = await db
    .select({ id: matchdays.id, number: matchdays.number })
    .from(matchdays)
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .orderBy(desc(matchdays.number))
    .limit(FORM_GW_COUNT);

  const orderedIds = [...recentMatchdays].reverse().map((row) => row.id);
  const lastGwId = recentMatchdays[0]?.id ?? null;

  const formByPlayer = new Map<string, number[]>();
  const lastGwByPlayer = new Map<string, number>();

  if (orderedIds.length > 0) {
    const ledgerRows = await db
      .select({
        playerId: pointLedger.playerId,
        matchdayId: pointLedger.matchdayId,
        points: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`.as(
          "points",
        ),
      })
      .from(pointLedger)
      .where(inArray(pointLedger.matchdayId, orderedIds))
      .groupBy(pointLedger.playerId, pointLedger.matchdayId);

    const pointsByPlayerGw = new Map<string, Map<string, number>>();
    for (const row of ledgerRows) {
      let byGw = pointsByPlayerGw.get(row.playerId);
      if (!byGw) {
        byGw = new Map();
        pointsByPlayerGw.set(row.playerId, byGw);
      }
      byGw.set(row.matchdayId, row.points);
    }

    for (const [playerId, byGw] of pointsByPlayerGw) {
      const form = orderedIds.map((gwId) => byGw.get(gwId) ?? 0);
      formByPlayer.set(playerId, form);
      if (lastGwId) {
        lastGwByPlayer.set(playerId, byGw.get(lastGwId) ?? 0);
      }
    }
  }

  const seasonTotals = await db
    .select({
      playerId: pointLedger.playerId,
      points: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`.as(
        "points",
      ),
    })
    .from(pointLedger)
    .where(eq(pointLedger.seasonId, seasonId))
    .groupBy(pointLedger.playerId);

  const seasonPointsByPlayer = new Map(
    seasonTotals.map((row) => [row.playerId, row.points]),
  );

  const appearanceRows = await db
    .select({
      playerId: matchdayAttendance.playerId,
      appearances: sql<number>`count(distinct ${matchdayAttendance.matchdayId})::int`.as(
        "appearances",
      ),
    })
    .from(matchdayAttendance)
    .innerJoin(matchdays, eq(matchdayAttendance.matchdayId, matchdays.id))
    .where(
      and(eq(matchdays.seasonId, seasonId), eq(matchdays.status, "published")),
    )
    .groupBy(matchdayAttendance.playerId);

  const appearancesByPlayer = new Map(
    appearanceRows.map((row) => [row.playerId, row.appearances]),
  );

  return {
    formByPlayer,
    lastGwByPlayer,
    seasonPointsByPlayer,
    appearancesByPlayer,
  };
}

export async function getPickTeamData(
  db: AppDb,
  managerId: string,
  matchdayId?: string,
): Promise<PickTeamData | null> {
  const seasonId =
    (await getActiveSeasonId(db)) ??
    null;
  if (!seasonId) return null;

  const matchday =
    matchdayId != null
      ? (
          await db
            .select({
              id: matchdays.id,
              number: matchdays.number,
              playedOn: matchdays.playedOn,
              deadlineAt: matchdays.deadlineAt,
              status: matchdays.status,
              seasonId: matchdays.seasonId,
            })
            .from(matchdays)
            .where(eq(matchdays.id, matchdayId))
            .limit(1)
        )[0]
      : await getNextScheduledMatchday(db, seasonId);

  if (!matchday || matchday.seasonId !== seasonId) return null;

  const serverNow = await readDbNow(db);
  const lockState = { status: matchday.status, deadlineAt: matchday.deadlineAt };

  const playerRows = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      nickname: players.nickname,
      avatarUrl: players.avatarUrl,
    })
    .from(players)
    .where(eq(players.active, true))
    .orderBy(asc(players.displayName));

  const stats = await loadPlayerGameweekStats(db, seasonId);

  const playersOut: PickTeamPlayerRow[] = playerRows.map((player) => {
    const form = stats.formByPlayer.get(player.id) ?? [];
    return {
      id: player.id,
      displayName: player.displayName,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      form,
      lastGameweekPoints: stats.lastGwByPlayer.get(player.id) ?? null,
      expectedPoints: computeExpectedPoints(form),
      seasonPoints: stats.seasonPointsByPlayer.get(player.id) ?? 0,
      appearances: stats.appearancesByPlayer.get(player.id) ?? 0,
    };
  });

  const teamView = await getManagerFantasyTeamForViewer(
    db,
    matchday.id,
    managerId,
    {
      viewerUserId: managerId,
      viewerRole: "manager",
      targetManagerId: managerId,
    },
  );

  let myTeam: FantasyTeamPick | null = null;
  let myTeamSource: PickTeamData["myTeamSource"] = null;

  if (teamView.visibility === "visible" && teamView.playerIds.length === 5) {
    myTeam = {
      playerIds: teamView.playerIds,
      captainPlayerId: teamView.captainPlayerId,
      viceCaptainPlayerId: teamView.viceCaptainPlayerId,
    };
    myTeamSource = teamView.teamSource;
  }

  return {
    seasonId,
    matchday: {
      id: matchday.id,
      number: matchday.number,
      playedOn: matchday.playedOn,
      deadlineAt: matchday.deadlineAt,
      status: matchday.status,
    },
    serverNow,
    selectionOpen: isSelectionOpen(lockState, serverNow),
    locked: isLocked(lockState, serverNow),
    players: playersOut,
    myTeam,
    myTeamSource,
  };
}
