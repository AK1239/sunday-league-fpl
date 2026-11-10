import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, players, seasons, users } from "@/server/db/schema";
import { resolveEffectiveTeam } from "@/server/fantasy/effective-team";
import { isLocked } from "@/server/fantasy/lock";
import { loadSubmittedTeamsForSeason } from "./fantasy-team-view";

/** Pick stats and "selected by %" are hidden below this team count (privacy). */
export const MIN_TEAMS_FOR_SELECTED_BY = 3;

export type EffectiveTeamAggregate = {
  teams: number;
  selectedCounts: Map<string, number>;
  captainCounts: Map<string, number>;
  viceCaptainCounts: Map<string, number>;
};

export type PickStatPlayer = {
  playerId: string;
  displayName: string;
  kitKey: string | null;
  count: number;
  percent: number;
};

export type PublicGameweekPickStats = {
  matchdayId: string;
  number: number;
  playedOn: string;
  teamsCount: number;
  topCaptain: PickStatPlayer | null;
  topViceCaptain: PickStatPlayer | null;
  topSelected: PickStatPlayer[];
  uniqueCaptains: number;
  differential: PickStatPlayer | null;
};

/**
 * Effective squads for one gameweek (carry-overs included). Returns null when
 * too few teams exist to show public pick stats.
 */
export async function aggregateEffectiveTeamsForMatchday(
  db: AppDb,
  seasonId: string,
  matchday: { id: string; number: number; playedOn: string },
): Promise<EffectiveTeamAggregate | null> {
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

  const selectedCounts = new Map<string, number>();
  const captainCounts = new Map<string, number>();
  const viceCaptainCounts = new Map<string, number>();
  let teams = 0;

  for (const manager of managers) {
    const team = resolveEffectiveTeam(manager.id, timeline, submitted);
    if (!team || team.playerIds.length !== 5) continue;
    teams += 1;
    for (const playerId of team.playerIds) {
      selectedCounts.set(playerId, (selectedCounts.get(playerId) ?? 0) + 1);
    }
    captainCounts.set(
      team.captainPlayerId,
      (captainCounts.get(team.captainPlayerId) ?? 0) + 1,
    );
    viceCaptainCounts.set(
      team.viceCaptainPlayerId,
      (viceCaptainCounts.get(team.viceCaptainPlayerId) ?? 0) + 1,
    );
  }

  if (teams < MIN_TEAMS_FOR_SELECTED_BY) return null;

  return { teams, selectedCounts, captainCounts, viceCaptainCounts };
}

function topFromCounts(
  counts: Map<string, number>,
  teams: number,
): { playerId: string; count: number; percent: number } | null {
  let best: { playerId: string; count: number; percent: number } | null = null;
  for (const [playerId, count] of counts) {
    if (!best || count > best.count) {
      best = {
        playerId,
        count,
        percent: Math.round((count / teams) * 100),
      };
    }
  }
  return best;
}

function lowestSelected(
  selectedCounts: Map<string, number>,
  teams: number,
): { playerId: string; count: number; percent: number } | null {
  let worst: { playerId: string; count: number; percent: number } | null = null;
  for (const [playerId, count] of selectedCounts) {
    const percent = Math.round((count / teams) * 100);
    if (!worst || percent < worst.percent || (percent === worst.percent && count < worst.count)) {
      worst = { playerId, count, percent };
    }
  }
  return worst;
}

async function enrichPlayers(
  db: AppDb,
  rows: { playerId: string; count: number; percent: number }[],
): Promise<PickStatPlayer[]> {
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r.playerId))];
  const playerRows = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      kitKey: players.kitKey,
    })
    .from(players)
    .where(inArray(players.id, ids));
  const byId = new Map(playerRows.map((p) => [p.id, p]));

  return rows.map((row) => {
    const p = byId.get(row.playerId);
    return {
      playerId: row.playerId,
      displayName: p?.displayName ?? "Unknown",
      kitKey: p?.kitKey ?? null,
      count: row.count,
      percent: row.percent,
    };
  });
}

export async function buildPublicGameweekPickStats(
  db: AppDb,
  seasonId: string,
  matchday: { id: string; number: number; playedOn: string },
): Promise<PublicGameweekPickStats | null> {
  const agg = await aggregateEffectiveTeamsForMatchday(db, seasonId, matchday);
  if (!agg) return null;

  const { teams, selectedCounts, captainCounts, viceCaptainCounts } = agg;

  const topCaptainRaw = topFromCounts(captainCounts, teams);
  const topViceRaw = topFromCounts(viceCaptainCounts, teams);
  const differentialRaw = lowestSelected(selectedCounts, teams);

  const topSelectedRaw = [...selectedCounts.entries()]
    .map(([playerId, count]) => ({
      playerId,
      count,
      percent: Math.round((count / teams) * 100),
    }))
    .sort((a, b) => b.count - a.count || b.percent - a.percent)
    .slice(0, 5);

  const enriched = await enrichPlayers(db, [
    ...(topCaptainRaw ? [topCaptainRaw] : []),
    ...(topViceRaw ? [topViceRaw] : []),
    ...(differentialRaw ? [differentialRaw] : []),
    ...topSelectedRaw,
  ]);
  const byId = new Map(enriched.map((p) => [p.playerId, p]));

  return {
    matchdayId: matchday.id,
    number: matchday.number,
    playedOn: matchday.playedOn,
    teamsCount: teams,
    topCaptain: topCaptainRaw ? (byId.get(topCaptainRaw.playerId) ?? null) : null,
    topViceCaptain: topViceRaw
      ? (byId.get(topViceRaw.playerId) ?? null)
      : null,
    topSelected: topSelectedRaw
      .map((r) => byId.get(r.playerId))
      .filter((p): p is PickStatPlayer => p != null),
    uniqueCaptains: captainCounts.size,
    differential: differentialRaw
      ? (byId.get(differentialRaw.playerId) ?? null)
      : null,
  };
}

/** Most recent gameweek whose selection deadline has passed (incl. published). */
export async function getLatestLockedMatchday(
  db: AppDb,
  seasonId: string,
  now: Date,
): Promise<{
  id: string;
  number: number;
  playedOn: string;
} | null> {
  const rows = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      deadlineAt: matchdays.deadlineAt,
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

  for (const row of rows) {
    if (isLocked(row, now)) {
      return { id: row.id, number: row.number, playedOn: row.playedOn };
    }
  }
  return null;
}

export async function getPublicGameweekPickStats(
  db: AppDb,
  seasonId: string,
  now: Date,
): Promise<PublicGameweekPickStats | null> {
  const matchday = await getLatestLockedMatchday(db, seasonId, now);
  if (!matchday) return null;
  return buildPublicGameweekPickStats(db, seasonId, matchday);
}
