import { asc, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  managerScoreLines,
  managerMatchdayScores,
  matchdays,
  players,
  pointLedger,
  users,
} from "@/server/db/schema";

export type PlayerLedgerLine = {
  id: string;
  playerId: string;
  playerName: string;
  kind: string;
  points: number;
  matchId: string | null;
};

export type ManagerScoreInspectorLine = {
  managerId: string;
  managerName: string;
  playerId: string;
  playerName: string;
  role: string;
  basePoints: number;
  multiplier: number;
  points: number;
  attended: boolean;
  teamSource: string;
};

export type ManagerMatchdayTotal = {
  managerId: string;
  managerName: string;
  totalPoints: number;
  multiplierPlayerId: string | null;
  multiplierPlayerName: string | null;
  teamSource: string;
};

export type ScoringInspectorData = {
  matchdayId: string;
  number: number;
  playedOn: string;
  status: string;
  playerLedger: PlayerLedgerLine[];
  managerLines: ManagerScoreInspectorLine[];
  managerTotals: ManagerMatchdayTotal[];
};

export async function loadScoringInspector(
  db: AppDb,
  matchdayId: string,
): Promise<ScoringInspectorData | null> {
  const mdRows = await db
    .select({
      id: matchdays.id,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  const md = mdRows[0];
  if (!md) return null;

  const ledgerRows = await db
    .select({
      id: pointLedger.id,
      playerId: pointLedger.playerId,
      playerName: players.displayName,
      kind: pointLedger.kind,
      points: pointLedger.points,
      matchId: pointLedger.matchId,
    })
    .from(pointLedger)
    .innerJoin(players, eq(pointLedger.playerId, players.id))
    .where(eq(pointLedger.matchdayId, matchdayId))
    .orderBy(asc(players.displayName), asc(pointLedger.kind));

  const managerLineRows = await db
    .select({
      managerId: managerScoreLines.managerId,
      managerName: users.displayName,
      playerId: managerScoreLines.playerId,
      playerName: players.displayName,
      role: managerScoreLines.role,
      basePoints: managerScoreLines.basePoints,
      multiplier: managerScoreLines.multiplier,
      points: managerScoreLines.points,
      attended: managerScoreLines.attended,
      teamSource: managerScoreLines.teamSource,
    })
    .from(managerScoreLines)
    .innerJoin(users, eq(managerScoreLines.managerId, users.id))
    .innerJoin(players, eq(managerScoreLines.playerId, players.id))
    .where(eq(managerScoreLines.matchdayId, matchdayId))
    .orderBy(asc(users.displayName), asc(players.displayName));

  const totalRows = await db
    .select({
      managerId: managerMatchdayScores.managerId,
      managerName: users.displayName,
      totalPoints: managerMatchdayScores.totalPoints,
      multiplierPlayerId: managerMatchdayScores.multiplierPlayerId,
      teamSource: managerMatchdayScores.teamSource,
    })
    .from(managerMatchdayScores)
    .innerJoin(users, eq(managerMatchdayScores.managerId, users.id))
    .where(eq(managerMatchdayScores.matchdayId, matchdayId))
    .orderBy(asc(users.displayName));

  const multiplierIds = [
    ...new Set(
      totalRows
        .map((r) => r.multiplierPlayerId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const multiplierNames = new Map<string, string>();
  if (multiplierIds.length > 0) {
    const nameRows = await db
      .select({ id: players.id, displayName: players.displayName })
      .from(players)
      .where(inArray(players.id, multiplierIds));
    for (const row of nameRows) {
      multiplierNames.set(row.id, row.displayName);
    }
  }

  return {
    matchdayId: md.id,
    number: md.number,
    playedOn: md.playedOn,
    status: md.status,
    playerLedger: ledgerRows,
    managerLines: managerLineRows,
    managerTotals: totalRows.map((row) => ({
      managerId: row.managerId,
      managerName: row.managerName,
      totalPoints: row.totalPoints,
      multiplierPlayerId: row.multiplierPlayerId,
      multiplierPlayerName: row.multiplierPlayerId
        ? (multiplierNames.get(row.multiplierPlayerId) ?? null)
        : null,
      teamSource: row.teamSource,
    })),
  };
}
