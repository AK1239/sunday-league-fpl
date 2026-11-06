import { and, asc, eq, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  fantasyTransfers,
  managerFreeTransferAdjustments,
  matchdays,
} from "@/server/db/schema";
import {
  computeBalanceChain,
  type FreeTransferRules,
  type MatchdayBalanceInput,
} from "@/server/fantasy/free-transfers";

export async function sumAdjustmentsForMatchday(
  tx: DbExecutor,
  managerId: string,
  matchdayId: string,
): Promise<number> {
  const [row] = await tx
    .select({
      total: sql<number>`coalesce(sum(${managerFreeTransferAdjustments.delta}), 0)::int`,
    })
    .from(managerFreeTransferAdjustments)
    .where(
      and(
        eq(managerFreeTransferAdjustments.managerId, managerId),
        eq(managerFreeTransferAdjustments.matchdayId, matchdayId),
      ),
    );
  return row?.total ?? 0;
}

export async function countActiveTransfersForMatchday(
  tx: DbExecutor,
  managerId: string,
  matchdayId: string,
): Promise<number> {
  const [row] = await tx
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(fantasyTransfers)
    .where(
      and(
        eq(fantasyTransfers.managerId, managerId),
        eq(fantasyTransfers.matchdayId, matchdayId),
        eq(fantasyTransfers.status, "active"),
      ),
    );
  return row?.count ?? 0;
}

/**
 * Free transfers available (A_m) for an open window, from prior windows in the chain only.
 */
export async function computeFreeAvailableForMatchday(
  tx: DbExecutor,
  input: {
    managerId: string;
    seasonId: string;
    matchdayId: string;
    matchdayNumber: number;
    transfersStartMatchday: number;
    rules: FreeTransferRules;
  },
): Promise<number> {
  const priorMatchdays = await tx
    .select({
      id: matchdays.id,
      number: matchdays.number,
      status: matchdays.status,
    })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.seasonId, input.seasonId),
        sql`${matchdays.number} >= ${input.transfersStartMatchday}`,
        sql`${matchdays.number} < ${input.matchdayNumber}`,
      ),
    )
    .orderBy(asc(matchdays.number));

  const chainInputs: MatchdayBalanceInput[] = [];

  for (const md of priorMatchdays) {
    if (md.status === "cancelled") {
      chainInputs.push({
        key: md.id,
        cancelled: true,
        transfersMade: 0,
      });
      continue;
    }

    const transfersMade = await countActiveTransfersForMatchday(
      tx,
      input.managerId,
      md.id,
    );
    const adjustment = await sumAdjustmentsForMatchday(
      tx,
      input.managerId,
      md.id,
    );
    chainInputs.push({
      key: md.id,
      transfersMade,
      adjustment,
    });
  }

  const steps = computeBalanceChain(chainInputs, input.rules, 0);
  const carryIn = steps.length > 0 ? steps[steps.length - 1]!.carry : 0;
  const base = Math.min(input.rules.cap, carryIn + input.rules.grant);
  const adjustment = await sumAdjustmentsForMatchday(
    tx,
    input.managerId,
    input.matchdayId,
  );
  return base + adjustment;
}
