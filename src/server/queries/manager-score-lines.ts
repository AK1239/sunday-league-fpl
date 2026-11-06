import { and, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { managerScoreLines } from "@/server/db/schema";

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
