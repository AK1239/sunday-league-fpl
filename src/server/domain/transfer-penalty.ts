import { and, eq, inArray, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import { fantasyTransfers, managerTransferWindows } from "@/server/db/schema";

export function deriveTransferPenalty(input: {
  transfersMade: number;
  freeAvailable: number;
  penaltyPerExtra: number;
  unlimited: boolean;
}): number {
  if (input.unlimited) return 0;
  const extra = Math.max(0, input.transfersMade - input.freeAvailable);
  if (extra === 0) return 0;
  return -extra * input.penaltyPerExtra;
}

/** Read stored window facts + active transfer rows; never writes. */
export async function loadTransferPenaltiesForMatchday(
  tx: DbExecutor,
  matchdayId: string,
  managerIds: readonly string[],
): Promise<Map<string, number>> {
  const penalties = new Map<string, number>();
  if (managerIds.length === 0) return penalties;

  const windows = await tx
    .select({
      managerId: managerTransferWindows.managerId,
      freeAvailable: managerTransferWindows.freeAvailable,
      penaltyPerExtra: managerTransferWindows.penaltyPerExtra,
      unlimited: managerTransferWindows.unlimited,
      voidedAt: managerTransferWindows.voidedAt,
    })
    .from(managerTransferWindows)
    .where(
      and(
        eq(managerTransferWindows.matchdayId, matchdayId),
        inArray(managerTransferWindows.managerId, [...managerIds]),
      ),
    );

  const transferCounts = await tx
    .select({
      managerId: fantasyTransfers.managerId,
      count: sql<number>`count(*)::int`,
    })
    .from(fantasyTransfers)
    .where(
      and(
        eq(fantasyTransfers.matchdayId, matchdayId),
        eq(fantasyTransfers.status, "active"),
        inArray(fantasyTransfers.managerId, [...managerIds]),
      ),
    )
    .groupBy(fantasyTransfers.managerId);

  const madeByManager = new Map(
    transferCounts.map((row) => [row.managerId, row.count]),
  );

  for (const window of windows) {
    if (window.voidedAt) {
      penalties.set(window.managerId, 0);
      continue;
    }
    penalties.set(
      window.managerId,
      deriveTransferPenalty({
        transfersMade: madeByManager.get(window.managerId) ?? 0,
        freeAvailable: window.freeAvailable,
        penaltyPerExtra: window.penaltyPerExtra,
        unlimited: window.unlimited,
      }),
    );
  }

  return penalties;
}
