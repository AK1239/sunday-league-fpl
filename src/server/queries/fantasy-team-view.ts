import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  matchdays,
  players,
  seasons,
  users,
} from "@/server/db/schema";
import type { UserRole } from "@/server/auth/session";
import {
  resolveEffectiveTeam,
  type MatchdayTimelineEntry,
  type SubmittedFantasyTeam,
} from "@/server/fantasy/effective-team";
import {
  canViewManagerFantasyTeam,
  type FantasyTeamViewer,
} from "@/server/fantasy/team-visibility";

export type FantasyTeamPlayerSlot = {
  playerId: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: "player" | "captain" | "vice_captain";
};

export type FantasyTeamView =
  | { visibility: "hidden" }
  | {
      visibility: "visible";
      managerId: string;
      managerDisplayName: string;
      matchdayId: string;
      teamSource: "manual" | "admin" | "carry_over";
      captainPlayerId: string;
      viceCaptainPlayerId: string;
      playerIds: string[];
      slots: FantasyTeamPlayerSlot[];
    };

async function readDbNow(db: AppDb): Promise<Date> {
  const result = await db.execute<{ now: Date }>(sql`select now() as now`);
  const row = result.rows[0];
  if (!row?.now) return new Date();
  return row.now instanceof Date ? row.now : new Date(String(row.now));
}

export async function loadSubmittedTeamsForSeason(
  db: AppDb,
  seasonId: string,
): Promise<SubmittedFantasyTeam[]> {
  const headers = await db
    .select({
      teamId: fantasyTeams.id,
      managerId: fantasyTeams.managerId,
      matchdayId: fantasyTeams.matchdayId,
      source: fantasyTeams.source,
      captainPlayerId: fantasyTeams.captainPlayerId,
      viceCaptainPlayerId: fantasyTeams.viceCaptainPlayerId,
      playedOn: matchdays.playedOn,
      number: matchdays.number,
      seasonStartsOn: seasons.startsOn,
    })
    .from(fantasyTeams)
    .innerJoin(matchdays, eq(fantasyTeams.matchdayId, matchdays.id))
    .innerJoin(seasons, eq(matchdays.seasonId, seasons.id))
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        inArray(fantasyTeams.source, ["manual", "admin", "carry_over"]),
      ),
    );

  if (headers.length === 0) return [];

  const teamIds = headers.map((h) => h.teamId);
  const playerRows = await db
    .select({
      fantasyTeamId: fantasyTeamPlayers.fantasyTeamId,
      playerId: fantasyTeamPlayers.playerId,
    })
    .from(fantasyTeamPlayers)
    .where(inArray(fantasyTeamPlayers.fantasyTeamId, teamIds));

  const playersByTeam = new Map<string, string[]>();
  for (const row of playerRows) {
    const list = playersByTeam.get(row.fantasyTeamId) ?? [];
    list.push(row.playerId);
    playersByTeam.set(row.fantasyTeamId, list);
  }

  return headers.map((header) => {
    const matchday: MatchdayTimelineEntry = {
      matchdayId: header.matchdayId,
      playedOn: header.playedOn,
      number: header.number,
      seasonStartsOn: header.seasonStartsOn,
    };
    return {
      managerId: header.managerId,
      matchday,
      source: header.source,
      captainPlayerId: header.captainPlayerId,
      viceCaptainPlayerId: header.viceCaptainPlayerId,
      playerIds: playersByTeam.get(header.teamId) ?? [],
    };
  });
}

function buildSlots(
  playerIds: readonly string[],
  captainPlayerId: string,
  viceCaptainPlayerId: string,
  playerMeta: Map<
    string,
    { displayName: string; nickname: string | null; avatarUrl: string | null }
  >,
): FantasyTeamPlayerSlot[] {
  return playerIds.map((playerId) => {
    const meta = playerMeta.get(playerId);
    let role: FantasyTeamPlayerSlot["role"] = "player";
    if (playerId === captainPlayerId) role = "captain";
    else if (playerId === viceCaptainPlayerId) role = "vice_captain";
    return {
      playerId,
      displayName: meta?.displayName ?? "Unknown",
      nickname: meta?.nickname ?? null,
      avatarUrl: meta?.avatarUrl ?? null,
      role,
    };
  });
}

export async function getManagerFantasyTeamForViewer(
  db: AppDb,
  matchdayId: string,
  targetManagerId: string,
  viewer: FantasyTeamViewer,
): Promise<FantasyTeamView> {
  const mdRows = await db
    .select({
      id: matchdays.id,
      seasonId: matchdays.seasonId,
      status: matchdays.status,
      deadlineAt: matchdays.deadlineAt,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      seasonStartsOn: seasons.startsOn,
    })
    .from(matchdays)
    .innerJoin(seasons, eq(matchdays.seasonId, seasons.id))
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  const md = mdRows[0];
  if (!md) {
    return { visibility: "hidden" };
  }

  const now = await readDbNow(db);
  if (
    !canViewManagerFantasyTeam(
      { ...viewer, targetManagerId },
      { status: md.status, deadlineAt: md.deadlineAt },
      now,
    )
  ) {
    return { visibility: "hidden" };
  }

  const [manager] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, targetManagerId))
    .limit(1);

  if (!manager) {
    return { visibility: "hidden" };
  }

  const stored = await db
    .select({
      id: fantasyTeams.id,
      source: fantasyTeams.source,
      captainPlayerId: fantasyTeams.captainPlayerId,
      viceCaptainPlayerId: fantasyTeams.viceCaptainPlayerId,
    })
    .from(fantasyTeams)
    .where(
      and(
        eq(fantasyTeams.managerId, targetManagerId),
        eq(fantasyTeams.matchdayId, matchdayId),
      ),
    )
    .limit(1);

  let captainPlayerId: string;
  let viceCaptainPlayerId: string;
  let playerIds: string[];
  let teamSource: "manual" | "admin" | "carry_over";

  const storedRow = stored[0];
  if (storedRow && (storedRow.source === "manual" || storedRow.source === "admin")) {
    teamSource = storedRow.source;
    captainPlayerId = storedRow.captainPlayerId;
    viceCaptainPlayerId = storedRow.viceCaptainPlayerId;
    const picks = await db
      .select({ playerId: fantasyTeamPlayers.playerId })
      .from(fantasyTeamPlayers)
      .where(eq(fantasyTeamPlayers.fantasyTeamId, storedRow.id));
    playerIds = picks.map((p) => p.playerId);
  } else {
    const submitted = await loadSubmittedTeamsForSeason(db, md.seasonId);
    const target: MatchdayTimelineEntry = {
      matchdayId: md.id,
      playedOn: md.playedOn,
      number: md.number,
      seasonStartsOn: md.seasonStartsOn,
    };
    const effective = resolveEffectiveTeam(
      targetManagerId,
      target,
      submitted,
    );
    if (!effective) {
      return {
        visibility: "visible",
        managerId: targetManagerId,
        managerDisplayName: manager.displayName,
        matchdayId,
        teamSource: "carry_over",
        captainPlayerId: "",
        viceCaptainPlayerId: "",
        playerIds: [],
        slots: [],
      };
    }
    teamSource = effective.teamSource;
    captainPlayerId = effective.captainPlayerId;
    viceCaptainPlayerId = effective.viceCaptainPlayerId;
    playerIds = [...effective.playerIds];
  }

  if (playerIds.length === 0) {
    return {
      visibility: "visible",
      managerId: targetManagerId,
      managerDisplayName: manager.displayName,
      matchdayId,
      teamSource,
      captainPlayerId,
      viceCaptainPlayerId,
      playerIds: [],
      slots: [],
    };
  }

  const metaRows = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      nickname: players.nickname,
      avatarUrl: players.avatarUrl,
    })
    .from(players)
    .where(inArray(players.id, playerIds));

  const meta = new Map(metaRows.map((row) => [row.id, row]));

  return {
    visibility: "visible",
    managerId: targetManagerId,
    managerDisplayName: manager.displayName,
    matchdayId,
    teamSource,
    captainPlayerId,
    viceCaptainPlayerId,
    playerIds,
    slots: buildSlots(
      playerIds,
      captainPlayerId,
      viceCaptainPlayerId,
      meta,
    ),
  };
}

export async function getNextScheduledMatchday(
  db: AppDb,
  seasonId: string,
): Promise<{
  id: string;
  number: number;
  playedOn: string;
  deadlineAt: Date;
  status: typeof matchdays.$inferSelect.status;
  seasonId: string;
} | null> {
  const rows = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      deadlineAt: matchdays.deadlineAt,
      status: matchdays.status,
      seasonId: matchdays.seasonId,
    })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, seasonId),
        sql`${matchdays.status} in ('scheduled', 'draft')`,
      ),
    )
    .orderBy(asc(matchdays.playedOn), asc(matchdays.number))
    .limit(1);

  return rows[0] ?? null;
}
