import { and, eq, inArray, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  fantasyTeams,
  fantasyTransfers,
  managerTransferWindows,
} from "@/server/db/schema";

const VOID_REASON = "Gameweek cancelled";

/** Void transfer windows and discard pending squad picks for a cancelled gameweek (§6.1). */
export async function voidTransferFactsForCancelledMatchday(
  tx: DbExecutor,
  matchdayId: string,
  voidedBy: string,
): Promise<void> {
  const now = sql`now()`;

  await tx
    .update(fantasyTransfers)
    .set({
      status: "void",
      voidedAt: now,
      voidReason: VOID_REASON,
      voidedBy,
    })
    .where(
      and(
        eq(fantasyTransfers.matchdayId, matchdayId),
        eq(fantasyTransfers.status, "active"),
      ),
    );

  await tx
    .update(managerTransferWindows)
    .set({ voidedAt: now, updatedAt: now })
    .where(eq(managerTransferWindows.matchdayId, matchdayId));

  await tx
    .delete(fantasyTeams)
    .where(
      and(
        eq(fantasyTeams.matchdayId, matchdayId),
        inArray(fantasyTeams.source, ["manual", "admin"]),
      ),
    );
}
