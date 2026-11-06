"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import {
  loadEditableTransferRulesForSeason,
  updateTransferRules,
} from "@/server/domain/transfer-rules-admin";
import { getActiveSeasonId } from "@/server/domain/matchdays-admin";
import { actionFail, actionOk, type ActionResult } from "./action-result";

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
