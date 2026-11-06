import { and, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { managerScoreLines, pointLedger } from "@/server/db/schema";

export type ManagerLine = {
  points: number;
  basePoints: number;
  multiplier: number;
  attended: boolean;
};

/** matchdayId -> playerId -> scored line, for one manager. */
export type ManagerLinesByMatchday = Record<
  string,
  Record<string, ManagerLine>
>;

export async function getManagerScoreLinesByMatchday(
  db: AppDb,
  managerId: string,
  matchdayIds: string[],
): Promise<ManagerLinesByMatchday> {
  if (matchdayIds.length === 0) return {};

  const rows = await db
    .select({
      matchdayId: managerScoreLines.matchdayId,
      playerId: managerScoreLines.playerId,
      points: managerScoreLines.points,
      basePoints: managerScoreLines.basePoints,
      multiplier: managerScoreLines.multiplier,
      attended: managerScoreLines.attended,
    })
    .from(managerScoreLines)
    .where(
      and(
        eq(managerScoreLines.managerId, managerId),
        inArray(managerScoreLines.matchdayId, matchdayIds),
      ),
    );

  const out: ManagerLinesByMatchday = {};
  for (const r of rows) {
    (out[r.matchdayId] ??= {})[r.playerId] = {
      points: r.points,
      basePoints: r.basePoints,
      multiplier: r.multiplier,
      attended: r.attended,
    };
  }
  return out;
}

export type PlayerPointEvent = {
  kind:
    "attendance" | "win" | "draw" | "goal" | "assist" | "mvp" | "clean_sheet";
  count: number;
  points: number;
};

/** matchdayId -> playerId -> grouped scoring events */
export type PlayerEventsByMatchday = Record<
  string,
  Record<string, PlayerPointEvent[]>
>;

export type GameweekDetails = {
  lines: ManagerLinesByMatchday;
  events: PlayerEventsByMatchday;
};

/** Per-player scored lines plus the ledger events that explain them. */
export async function getGameweekDetails(
  db: AppDb,
  managerId: string,
  matchdayIds: string[],
): Promise<GameweekDetails> {
  const lines = await getManagerScoreLinesByMatchday(
    db,
    managerId,
    matchdayIds,
  );
  const playerIds = [
    ...new Set(
      Object.values(lines).flatMap((byPlayer) => Object.keys(byPlayer)),
    ),
  ];
  if (playerIds.length === 0) return { lines, events: {} };

  const rows = await db
    .select({
      matchdayId: pointLedger.matchdayId,
      playerId: pointLedger.playerId,
      kind: pointLedger.kind,
      count: sql<number>`count(*)::int`,
      points: sql<number>`coalesce(sum(${pointLedger.points}), 0)::int`,
    })
    .from(pointLedger)
    .where(
      and(
        inArray(pointLedger.matchdayId, matchdayIds),
        inArray(pointLedger.playerId, playerIds),
      ),
    )
    .groupBy(pointLedger.matchdayId, pointLedger.playerId, pointLedger.kind);

  const events: PlayerEventsByMatchday = {};
  for (const r of rows) {
    ((events[r.matchdayId] ??= {})[r.playerId] ??= []).push({
      kind: r.kind,
      count: r.count,
      points: r.points,
    });
  }
  return { lines, events };
}
