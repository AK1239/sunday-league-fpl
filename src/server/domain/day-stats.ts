import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  matchdayAttendance,
  matchdayPlayerStats,
  matchdays,
} from "@/server/db/schema";
import { DAY_STAT_KEYS, type DayStats } from "@/lib/parse-player-results";
import { writeAuditLog } from "./audit-log";
import { MatchEntryError } from "./match-entry";
import { recomputeMatchday } from "./recompute-matchday";

export type DayStatsRow = { playerId: string; stats: DayStats };

export async function loadMatchdayDayStats(
  db: AppDb,
  matchdayId: string,
): Promise<DayStatsRow[]> {
  const rows = await db
    .select()
    .from(matchdayPlayerStats)
    .where(eq(matchdayPlayerStats.matchdayId, matchdayId));
  return rows.map((row) => ({
    playerId: row.playerId,
    stats: Object.fromEntries(
      DAY_STAT_KEYS.map((k) => [k, row[k]]),
    ) as DayStats,
  }));
}

/**
 * Replaces the whole day's per-player totals. Every listed player also becomes
 * an attendee (+attendance points), merged with `attendeeIds`.
 */
export async function saveMatchdayDayStatsAdmin(
  db: AppDb,
  adminUserId: string,
  matchdayId: string,
  rows: DayStatsRow[],
  attendeeIds: string[],
): Promise<void> {
  const merged = new Map<string, DayStats>();
  for (const row of rows) {
    const cur = merged.get(row.playerId);
    if (!cur) merged.set(row.playerId, { ...row.stats });
    else for (const k of DAY_STAT_KEYS) cur[k] += row.stats[k];
  }
  for (const stats of merged.values()) {
    for (const k of DAY_STAT_KEYS) {
      if (!Number.isInteger(stats[k]) || stats[k] < 0 || stats[k] > 99) {
        throw new MatchEntryError("Counts must be 0–99.", "VALIDATION");
      }
    }
  }
  const attendees = [...new Set([...attendeeIds, ...merged.keys()])];

  let status = "draft";
  await db.transaction(async (tx) => {
    const [md] = await tx
      .select({ status: matchdays.status })
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId))
      .limit(1);
    if (!md) throw new MatchEntryError("Matchday not found.", "NOT_FOUND");
    if (md.status === "cancelled") {
      throw new MatchEntryError(
        "Cancelled matchdays cannot be edited.",
        "CANCELLED",
      );
    }
    status = md.status;
    if (md.status === "scheduled") {
      await tx
        .update(matchdays)
        .set({ status: "draft" })
        .where(eq(matchdays.id, matchdayId));
    }

    await tx
      .delete(matchdayAttendance)
      .where(eq(matchdayAttendance.matchdayId, matchdayId));
    if (attendees.length > 0) {
      await tx
        .insert(matchdayAttendance)
        .values(attendees.map((playerId) => ({ matchdayId, playerId })));
    }

    await tx
      .delete(matchdayPlayerStats)
      .where(eq(matchdayPlayerStats.matchdayId, matchdayId));
    if (merged.size > 0) {
      await tx.insert(matchdayPlayerStats).values(
        [...merged].map(([playerId, stats]) => ({
          matchdayId,
          playerId,
          ...stats,
        })),
      );
    }

    await writeAuditLog(tx, {
      userId: adminUserId,
      action: "save_day_results",
      entity: "matchday",
      entityId: matchdayId,
      after: { players: merged.size, attendees: attendees.length },
    });
  });

  if (status === "published") await recomputeMatchday(matchdayId);
}
