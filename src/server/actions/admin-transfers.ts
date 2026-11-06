"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { grantFreeTransferAdjustment } from "@/server/domain/admin-transfers";
import {
  loadEditableTransferRulesForSeason,
  updateTransferRules,
} from "@/server/domain/transfer-rules-admin";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import { actionFail, actionOk, type ActionResult } from "./action-result";

const grantSchema = z.object({
  managerId: z.string().uuid(),
  matchdayId: z.string().uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Delta must be non-zero"),
  reason: z.string().trim().min(3).max(500),
});

export async function grantFreeTransfersAction(
  formData: FormData,
): Promise<ActionResult<{ changeCount: number }>> {
  const admin = await requireAdmin();
  const parsed = grantSchema.safeParse({
    managerId: formData.get("managerId"),
    matchdayId: formData.get("matchdayId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return actionFail("VALIDATION", "Check manager, gameweek, delta, and reason.");
  }

  try {
    const result = await grantFreeTransferAdjustment(getDb(), {
      adminId: admin.userId,
      ...parsed.data,
    });
    revalidatePath("/admin/transfers");
    revalidatePath("/my");
    revalidatePath("/pick");
    return actionOk({ changeCount: result.changes.length });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TRANSFERS_OFF") {
        return actionFail(
          "VALIDATION",
          "Transfers are not enabled for this gameweek.",
        );
      }
      if (error.message === "NOT_FOUND") {
        return actionFail("NOT_FOUND", "Gameweek not found.");
      }
    }
    return actionFail("ERROR", "Could not grant adjustment.");
  }
}

const rulesSchema = z.object({
  seasonId: z.string().uuid(),
  ruleSetId: z.string().uuid(),
  transfersStartMatchday: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    },
    z.number().int().min(1).nullable(),
  ),
  freeTransfersPerMatchday: z.coerce.number().int().min(0).max(10),
  maxBankedFreeTransfers: z.coerce.number().int().min(0).max(10),
  extraTransferPenalty: z.coerce.number().int().min(1).max(20),
});

export async function updateTransferRulesAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = rulesSchema.safeParse({
    seasonId: formData.get("seasonId"),
    ruleSetId: formData.get("ruleSetId"),
    transfersStartMatchday: formData.get("transfersStartMatchday"),
    freeTransfersPerMatchday: formData.get("freeTransfersPerMatchday"),
    maxBankedFreeTransfers: formData.get("maxBankedFreeTransfers"),
    extraTransferPenalty: formData.get("extraTransferPenalty"),
  });
  if (!parsed.success) {
    return actionFail("VALIDATION", "Check transfer rule values.");
  }

  const {
    seasonId,
    ruleSetId,
    transfersStartMatchday,
    freeTransfersPerMatchday,
    maxBankedFreeTransfers,
    extraTransferPenalty,
  } = parsed.data;

  try {
    await updateTransferRules(getDb(), ruleSetId, seasonId, {
      transfersStartMatchday,
      freeTransfersPerMatchday,
      maxBankedFreeTransfers,
      extraTransferPenalty,
    });
    revalidatePath("/admin/transfers");
    revalidatePath("/pick");
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "RULES_LOCKED") {
      return actionFail(
        "LOCKED",
        "Transfer rules cannot change after a gameweek has locked.",
      );
    }
    if (error instanceof Error && error.message === "START_TOO_EARLY") {
      return actionFail(
        "VALIDATION",
        "Start gameweek must be after published or past-deadline gameweeks.",
      );
    }
    return actionFail("ERROR", "Could not save transfer rules.");
  }
}

export async function loadTransferRulesForActiveSeasonAction(): Promise<
  ActionResult<
    Awaited<ReturnType<typeof loadEditableTransferRulesForSeason>> & {
      seasonId: string;
    }
  >
> {
  await requireAdmin();
  const seasonId = await getActiveSeasonId(getDb());
  if (!seasonId) {
    return actionFail("NOT_FOUND", "No active season.");
  }
  const rules = await loadEditableTransferRulesForSeason(getDb(), seasonId);
  if (!rules) {
    return actionFail("NOT_FOUND", "Season rules not found.");
  }
  return actionOk({ ...rules, seasonId });
}
