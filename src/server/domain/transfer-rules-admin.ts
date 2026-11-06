import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { matchdays, scoringRuleSets, seasons } from "@/server/db/schema";
import { isLocked } from "@/server/fantasy/lock";
import {
  seasonTransferRulesFromRow,
  type TransferRuleSetRow,
} from "@/server/fantasy/transfer-rules";

export type TransferRulesEditMode =
  | "editable"
  | "enable_only"
  | "locked";

export type EditableTransferRules = {
  ruleSetId: string;
  transfersStartMatchday: number | null;
  freeTransfersPerMatchday: number;
  maxBankedFreeTransfers: number;
  extraTransferPenalty: number;
  /** @deprecated use editMode */
  locked: boolean;
  editMode: TransferRulesEditMode;
  /** When enable_only: first start GW must be greater than this (published/past-deadline GWs). */
  minStartGameweek: number | null;
};

function resolveEditMode(input: {
  transfersStartMatchday: number | null;
  maxLockedGameweekNumber: number | null;
}): TransferRulesEditMode {
  const hasLocked = input.maxLockedGameweekNumber != null;
  if (!hasLocked) return "editable";
  if (input.transfersStartMatchday == null) return "enable_only";
  return "locked";
}

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
      number: matchdays.number,
      status: matchdays.status,
      deadlineAt: matchdays.deadlineAt,
    })
    .from(matchdays)
    .where(eq(matchdays.seasonId, seasonId));

  let maxLockedGameweekNumber: number | null = null;
  for (const md of mds) {
    if (!isLocked(md, now)) continue;
    if (
      maxLockedGameweekNumber == null ||
      md.number > maxLockedGameweekNumber
    ) {
      maxLockedGameweekNumber = md.number;
    }
  }

  const editMode = resolveEditMode({
    transfersStartMatchday: row.transfersStartMatchday,
    maxLockedGameweekNumber,
  });

  return {
    ruleSetId: row.ruleSetId,
    transfersStartMatchday: row.transfersStartMatchday,
    freeTransfersPerMatchday: row.freeTransfersPerMatchday,
    maxBankedFreeTransfers: row.maxBankedFreeTransfers,
    extraTransferPenalty: row.extraTransferPenalty,
    locked: editMode === "locked",
    editMode,
    minStartGameweek:
      maxLockedGameweekNumber != null
        ? maxLockedGameweekNumber + 1
        : null,
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

  if (editable.editMode === "locked") {
    throw new Error("RULES_LOCKED");
  }

  if (editable.editMode === "enable_only") {
    if (
      patch.freeTransfersPerMatchday !== undefined ||
      patch.maxBankedFreeTransfers !== undefined ||
      patch.extraTransferPenalty !== undefined
    ) {
      throw new Error("RULES_LOCKED");
    }
    if (patch.transfersStartMatchday === undefined) return;
    const start = patch.transfersStartMatchday;
    if (start == null) {
      throw new Error("VALIDATION");
    }
    if (
      editable.minStartGameweek != null &&
      start < editable.minStartGameweek
    ) {
      throw new Error("START_TOO_EARLY");
    }
    await db
      .update(scoringRuleSets)
      .set({ transfersStartMatchday: start })
      .where(eq(scoringRuleSets.id, ruleSetId));
    return;
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
