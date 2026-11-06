"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import {
  FantasyTeamError,
  saveFantasyTeam,
} from "@/server/domain/save-fantasy-team";
import { submitTeam } from "@/server/domain/submit-team";
import type { FantasyTeamPick } from "@/server/fantasy/validate-team";
import { getPickTeamData } from "@/server/queries/pick-team-data";
import { getManagerFantasyTeamForViewer } from "@/server/queries/fantasy-team-view";
import { actionFail, actionOk, type ActionFailure, type ActionResult } from "./action-result";

const pickSchema = z.object({
  playerIds: z.array(z.string().uuid()).length(5),
  captainPlayerId: z.string().uuid(),
  viceCaptainPlayerId: z.string().uuid(),
});

function mapFantasyTeamError(error: unknown): ActionFailure | null {
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

export async function saveFantasyTeamAction(
  matchdayId: string,
  pick: FantasyTeamPick,
): Promise<ActionResult<{ teamId: string }>> {
  const session = await requireUser();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid gameweek.");
  }

  const parsed = pickSchema.safeParse(pick);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Pick exactly 5 players with captain and vice.");
  }

  try {
    const result = await submitTeam(
      getDb(),
      matchdayId,
      {
        ...parsed.data,
        expectedVersion: 0,
        acknowledgedPenalty: 0,
      },
      session.userId,
    );
    revalidatePath("/pick");
    revalidatePath("/my");
    return actionOk({ teamId: result.teamId });
  } catch (error) {
    return (
      mapFantasyTeamError(error) ?? actionFail("ERROR", "Could not save team.")
    );
  }
}

export async function overrideFantasyTeamAdminAction(
  matchdayId: string,
  targetManagerId: string,
  reason: string,
  pick: FantasyTeamPick,
): Promise<ActionResult<{ teamId: string }>> {
  const session = await requireAdmin();
  if (
    !z.string().uuid().safeParse(matchdayId).success ||
    !z.string().uuid().safeParse(targetManagerId).success
  ) {
    return actionFail("VALIDATION", "Invalid manager or gameweek.");
  }

  const parsed = pickSchema.safeParse(pick);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Pick exactly 5 players with captain and vice.");
  }

  try {
    const result = await saveFantasyTeam(getDb(), matchdayId, parsed.data, {
      mode: "admin_override",
      adminUserId: session.userId,
      targetManagerId,
      reason,
    });
    revalidatePath("/pick");
    revalidatePath("/my");
    revalidatePath("/");
    revalidatePath("/table");
    return actionOk(result);
  } catch (error) {
    return (
      mapFantasyTeamError(error) ??
      actionFail("ERROR", "Could not override team.")
    );
  }
}

export async function loadPickTeamDataAction(matchdayId?: string) {
  const session = await requireUser();
  return getPickTeamData(getDb(), session.userId, matchdayId);
}

export async function loadManagerFantasyTeamAction(
  matchdayId: string,
  targetManagerId: string,
) {
  const session = await requireUser();
  return getManagerFantasyTeamForViewer(getDb(), matchdayId, targetManagerId, {
    viewerUserId: session.userId,
    viewerRole: session.role,
    targetManagerId,
  });
}

/** Public-safe: pass null viewer for anonymous reads after deadline. */
export async function loadManagerFantasyTeamPublicAction(
  matchdayId: string,
  targetManagerId: string,
) {
  if (
    !z.string().uuid().safeParse(matchdayId).success ||
    !z.string().uuid().safeParse(targetManagerId).success
  ) {
    return { visibility: "hidden" as const };
  }
  return getManagerFantasyTeamForViewer(getDb(), matchdayId, targetManagerId, {
    viewerUserId: null,
    viewerRole: null,
    targetManagerId,
  });
}
