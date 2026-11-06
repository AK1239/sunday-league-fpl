"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { MatchEntryError } from "@/server/domain/match-entry";
import {
  deleteMatchAdmin,
  MatchdayPublishError,
  publishMatchdayAdmin,
  recalculateMatchdayAdmin,
  unpublishMatchdayAdmin,
} from "@/server/domain/matchday-publish";
import {
  actionFail,
  actionOk,
  type ActionFailure,
  type ActionResult,
} from "./action-result";

function mapPublishError(error: unknown): ActionFailure | null {
  if (error instanceof MatchdayPublishError) {
    return actionFail(error.code, error.message);
  }
  return null;
}

function revalidateMatchdayPaths(matchdayId: string) {
  revalidatePath(`/admin/matchdays/${matchdayId}/entry`);
  revalidatePath(`/admin/matchdays/${matchdayId}/inspector`);
  revalidatePath("/admin/matchdays");
  revalidatePath("/");
  revalidatePath("/table");
}

export async function publishMatchdayAction(
  matchdayId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  try {
    await publishMatchdayAdmin(getDb(), session.userId, matchdayId);
    revalidateMatchdayPaths(matchdayId);
    return actionOk();
  } catch (error) {
    return (
      mapPublishError(error) ??
      actionFail("ERROR", "Could not publish matchday.")
    );
  }
}

export async function unpublishMatchdayAction(
  matchdayId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  try {
    await unpublishMatchdayAdmin(getDb(), session.userId, matchdayId);
    revalidateMatchdayPaths(matchdayId);
    return actionOk();
  } catch (error) {
    return (
      mapPublishError(error) ??
      actionFail("ERROR", "Could not unpublish matchday.")
    );
  }
}

export async function recalculateMatchdayAction(
  matchdayId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  try {
    await recalculateMatchdayAdmin(getDb(), session.userId, matchdayId);
    revalidateMatchdayPaths(matchdayId);
    return actionOk();
  } catch (error) {
    return (
      mapPublishError(error) ??
      actionFail("ERROR", "Could not recalculate scores.")
    );
  }
}

export async function deleteMatchAction(
  matchdayId: string,
  matchId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (
    !z.string().uuid().safeParse(matchdayId).success ||
    !z.string().uuid().safeParse(matchId).success
  ) {
    return actionFail("VALIDATION", "Invalid match.");
  }

  try {
    await deleteMatchAdmin(getDb(), session.userId, matchdayId, matchId);
    revalidateMatchdayPaths(matchdayId);
    return actionOk();
  } catch (error) {
    if (error instanceof MatchEntryError) {
      return actionFail(error.code, error.message);
    }
    return (
      mapPublishError(error) ?? actionFail("ERROR", "Could not delete match.")
    );
  }
}
