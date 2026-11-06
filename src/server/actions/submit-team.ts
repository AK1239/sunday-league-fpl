"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { FantasyTeamError } from "@/server/domain/save-fantasy-team";
import {
  submitTeam,
  type SubmitTeamRequest,
} from "@/server/domain/submit-team";
import type { TransferWindowSummary } from "@/server/fantasy/transfer-summary";
import {
  actionFail,
  actionOk,
  type ActionFailure,
  type ActionResult,
} from "./action-result";

const submitSchema = z.object({
  playerIds: z.array(z.string().uuid()).length(5),
  captainPlayerId: z.string().uuid(),
  viceCaptainPlayerId: z.string().uuid(),
  expectedVersion: z.number().int().min(0),
  acknowledgedPenalty: z.number().int().min(0),
  chipCode: z.string().nullable().optional(),
  reservePlayerIds: z.array(z.string().uuid()).max(2).optional(),
});

function mapSubmitError(error: unknown): ActionFailure | null {
  if (error instanceof FantasyTeamError) {
    const meta = error.meta;
    const fieldErrors =
      meta && typeof meta === "object"
        ? Object.fromEntries(
            Object.entries(meta).map(([k, v]) => [k, String(v)]),
          )
        : undefined;
    return actionFail(error.code, error.message, fieldErrors);
  }
  return null;
}

export type SubmitTeamActionResult = ActionResult<{
  teamId: string;
  version: number;
  summary: TransferWindowSummary | null;
}>;

export async function submitTeamAction(
  matchdayId: string,
  body: SubmitTeamRequest,
): Promise<SubmitTeamActionResult> {
  const session = await requireUser();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid gameweek.");
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Invalid team submission.");
  }

  try {
    const result = await submitTeam(
      getDb(),
      matchdayId,
      parsed.data,
      session.userId,
    );
    revalidatePath("/pick");
    revalidatePath("/my");
    return actionOk(result);
  } catch (error) {
    return (
      mapSubmitError(error) ?? actionFail("ERROR", "Could not submit team.")
    );
  }
}
