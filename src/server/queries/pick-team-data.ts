import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  matchdayAttendance,
  matchdays,
  players,
  pointLedger,
  seasons,
  users,
} from "@/server/db/schema";
import { resolveEffectiveTeam } from "@/server/fantasy/effective-team";
import { computeExpectedPoints } from "@/server/fantasy/expected-points";
import { isLocked, isSelectionOpen } from "@/server/fantasy/lock";
import type { FantasyTeamPick } from "@/server/fantasy/validate-team";
import { ensureAutoScheduledMatchday } from "@/server/domain/auto-schedule-matchdays";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import {
  getManagerFantasyTeamForViewer,
  getNextScheduledMatchday,
  loadSubmittedTeamsForSeason,
} from "./fantasy-team-view";

const FORM_GW_COUNT = 5;

/** "Selected by %" is only shown once this many teams exist (protects privacy). */
export const MIN_TEAMS_FOR_SELECTED_BY = 3;

export type PickTeamPlayerRow = {
  id: string;
  displayName: string;
  nickname: string | null;
  /** Shirt kit (`lib/kits`); null = derive from name for legacy rows. */
  kitKey: string | null;
  avatarUrl: string | null;
  form: number[];
  lastGameweekPoints: number | null;
  expectedPoints: number;
  seasonPoints: number;
  appearances: number;
  /**
   * Share of teams (0-100) that have this player this gameweek, or null while
   * fewer than MIN_TEAMS_FOR_SELECTED_BY teams exist.
   */
  selectedByPercent: number | null;
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
  /** Fantasy team row version for manual/admin saves; 0 when no row or carry-over only. */
  myTeamVersion: number;
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
      appearances:
        sql<number>`count(distinct ${matchdayAttendance.matchdayId})::int`.as(
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

/**
 * Percent of teams that currently have each player for this gameweek
 * (carried-over teams count). Returns null when there are too few teams.
 */
async function loadSelectedByPercent(
  db: AppDb,
  seasonId: string,
  matchday: { id: string; number: number; playedOn: string },
): Promise<Map<string, number> | null> {
  const [season] = await db
    .select({ startsOn: seasons.startsOn })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season) return null;

  const managers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.role, ["manager", "admin"]),
        eq(users.status, "active"),
      ),
    );

  const submitted = await loadSubmittedTeamsForSeason(db, seasonId);
  const timeline = {
    matchdayId: matchday.id,
    playedOn: matchday.playedOn,
    number: matchday.number,
    seasonStartsOn: season.startsOn,
  };

  const counts = new Map<string, number>();
  let teams = 0;
  for (const manager of managers) {
    const team = resolveEffectiveTeam(manager.id, timeline, submitted);
    if (!team || team.playerIds.length !== 5) continue;
    teams += 1;
    for (const playerId of team.playerIds) {
      counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    }
  }

  if (teams < MIN_TEAMS_FOR_SELECTED_BY) return null;
  return new Map(
    [...counts].map(([playerId, n]) => [
      playerId,
      Math.round((n / teams) * 100),
    ]),
  );
}

export async function getPickTeamData(
  db: AppDb,
  managerId: string,
  matchdayId?: string,
): Promise<PickTeamData | null> {
  await ensureAutoScheduledMatchday(db);
  const seasonId = (await getActiveSeasonId(db)) ?? null;
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
  const lockState = {
    status: matchday.status,
    deadlineAt: matchday.deadlineAt,
  };

  const playerRows = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      nickname: players.nickname,
      kitKey: players.kitKey,
      avatarUrl: players.avatarUrl,
    })
    .from(players)
    .where(eq(players.active, true))
    .orderBy(asc(players.displayName));

  const stats = await loadPlayerGameweekStats(db, seasonId);
  const selectedBy = await loadSelectedByPercent(db, seasonId, matchday);

  const playersOut: PickTeamPlayerRow[] = playerRows.map((player) => {
    const form = stats.formByPlayer.get(player.id) ?? [];
    return {
      id: player.id,
      displayName: player.displayName,
      nickname: player.nickname,
      kitKey: player.kitKey,
      avatarUrl: player.avatarUrl,
      form,
      lastGameweekPoints: stats.lastGwByPlayer.get(player.id) ?? null,
      expectedPoints: computeExpectedPoints(form),
      seasonPoints: stats.seasonPointsByPlayer.get(player.id) ?? 0,
      appearances: stats.appearancesByPlayer.get(player.id) ?? 0,
      // null = hidden (too few teams); a player nobody picked is 0%.
      selectedByPercent: selectedBy ? (selectedBy.get(player.id) ?? 0) : null,
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
  let myTeamVersion = 0;
  let myTeamSource: PickTeamData["myTeamSource"] = null;

  if (teamView.visibility === "visible" && teamView.playerIds.length === 5) {
    myTeam = {
      playerIds: teamView.playerIds,
      captainPlayerId: teamView.captainPlayerId,
      viceCaptainPlayerId: teamView.viceCaptainPlayerId,
    };
    myTeamSource = teamView.teamSource;
    if (teamView.teamSource === "manual" || teamView.teamSource === "admin") {
      myTeamVersion = teamView.teamVersion;
    }
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
    myTeamVersion,
    myTeamSource,
  };
}
