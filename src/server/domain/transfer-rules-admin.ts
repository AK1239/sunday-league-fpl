import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, scoringRuleSets, seasons } from "@/server/db/schema";
import { isLocked } from "@/server/fantasy/lock";
import {
  seasonTransferRulesFromRow,
  type TransferRuleSetRow,
} from "@/server/fantasy/transfer-rules";

export type EditableTransferRules = {
  ruleSetId: string;
  transfersStartMatchday: number | null;
  freeTransfersPerMatchday: number;
  maxBankedFreeTransfers: number;
  extraTransferPenalty: number;
  locked: boolean;
};

export async function loadEditableTransferRulesForSeason(
  db: AppDb,
  seasonId: string,
  now = new Date(),
): Promise<EditableTransferRules | null> {
  const [row] = await db
    .select({
      ruleSetId: seasons.ruleSetId,
      transfersStartMatchday: scoringRuleSets.transfersStartMatchday,
      freeTransfersPerMatchday: scoringRuleSets.freeTransfersPerMatchday,
      maxBankedFreeTransfers: scoringRuleSets.maxBankedFreeTransfers,
      extraTransferPenalty: scoringRuleSets.extraTransferPenalty,
    })
    .from(seasons)
    .innerJoin(scoringRuleSets, eq(seasons.ruleSetId, scoringRuleSets.id))
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!row) return null;

  const mds = await db
    .select({
      status: matchdays.status,
      deadlineAt: matchdays.deadlineAt,
    })
    .from(matchdays)
    .where(eq(matchdays.seasonId, seasonId));

  const locked = mds.some((md) => isLocked(md, now));

  return {
    ruleSetId: row.ruleSetId,
    transfersStartMatchday: row.transfersStartMatchday,
    freeTransfersPerMatchday: row.freeTransfersPerMatchday,
    maxBankedFreeTransfers: row.maxBankedFreeTransfers,
    extraTransferPenalty: row.extraTransferPenalty,
    locked,
  };
}

export async function updateTransferRules(
  db: AppDb,
  ruleSetId: string,
  seasonId: string,
  patch: Partial<
    Pick<
      TransferRuleSetRow,
      | "transfersStartMatchday"
      | "freeTransfersPerMatchday"
      | "maxBankedFreeTransfers"
      | "extraTransferPenalty"
    >
  >,
  now = new Date(),
): Promise<void> {
  const editable = await loadEditableTransferRulesForSeason(db, seasonId, now);
  if (!editable || editable.ruleSetId !== ruleSetId) {
    throw new Error("NOT_FOUND");
  }
  if (editable.locked) {
    throw new Error("RULES_LOCKED");
  }

  const updates: Record<string, unknown> = {};
  if (patch.transfersStartMatchday !== undefined) {
    updates.transfersStartMatchday = patch.transfersStartMatchday;
  }
  if (patch.freeTransfersPerMatchday !== undefined) {
    updates.freeTransfersPerMatchday = patch.freeTransfersPerMatchday;
  }
  if (patch.maxBankedFreeTransfers !== undefined) {
    updates.maxBankedFreeTransfers = patch.maxBankedFreeTransfers;
  }
  if (patch.extraTransferPenalty !== undefined) {
    updates.extraTransferPenalty = patch.extraTransferPenalty;
  }

  if (Object.keys(updates).length === 0) return;

  await db
    .update(scoringRuleSets)
    .set(updates)
    .where(eq(scoringRuleSets.id, ruleSetId));
}

export function rulesFromEditable(
  row: Pick<
    EditableTransferRules,
    | "transfersStartMatchday"
    | "freeTransfersPerMatchday"
    | "maxBankedFreeTransfers"
    | "extraTransferPenalty"
  >,
) {
  return seasonTransferRulesFromRow({
    transfersStartMatchday: row.transfersStartMatchday,
    freeTransfersPerMatchday: row.freeTransfersPerMatchday,
    maxBankedFreeTransfers: row.maxBankedFreeTransfers,
    extraTransferPenalty: row.extraTransferPenalty,
  });
}
