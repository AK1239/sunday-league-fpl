"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import {
  addEmptyMatchAdmin,
  copyLineupFromPreviousMatchAdmin,
  loadMatchdayEntry,
  MatchEntryError,
  saveMatchDraftAdmin,
  saveMatchdayAttendanceAdmin,
} from "@/server/domain/match-entry";
import type { MatchDraftInput } from "@/server/domain/match-entry-types";
import { actionFail, actionOk, type ActionFailure, type ActionResult } from "./action-result";

const goalSchema = z.object({
  scorerId: z.string().uuid(),
  assistId: z.string().uuid().nullable(),
  side: z.enum(["A", "B"]),
});

const matchDraftSchema = z.object({
  matchId: z.string().uuid().nullable().optional(),
  matchNo: z.number().int().min(1),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  sideAPlayerIds: z.array(z.string().uuid()),
  sideBPlayerIds: z.array(z.string().uuid()),
  sideAGoalkeeperId: z.string().uuid().nullable(),
  sideBGoalkeeperId: z.string().uuid().nullable(),
  goals: z.array(goalSchema),
  mvpPlayerId: z.string().uuid().nullable(),
});

function mapEntryError(error: unknown): ActionFailure | null {
  if (error instanceof MatchEntryError) {
    return actionFail(error.code, error.message);
  }
  return null;
}

export async function saveMatchdayAttendanceAction(
  matchdayId: string,
  attendeeIds: string[],
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  try {
    await saveMatchdayAttendanceAdmin(
      getDb(),
      session.userId,
      matchdayId,
      attendeeIds,
    );
    revalidatePath(`/admin/matchdays/${matchdayId}/entry`);
    return actionOk();
  } catch (error) {
    return mapEntryError(error) ?? actionFail("ERROR", "Could not save attendance.");
  }
}

export async function saveMatchDraftAction(
  matchdayId: string,
  attendeeIds: string[],
  draft: MatchDraftInput,
): Promise<ActionResult<{ matchId: string }>> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  const parsed = matchDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Invalid match data.");
  }

  try {
    const result = await saveMatchDraftAdmin(
      getDb(),
      session.userId,
      matchdayId,
      parsed.data,
      attendeeIds,
    );
    revalidatePath(`/admin/matchdays/${matchdayId}/entry`);
    return actionOk(result);
  } catch (error) {
    return (
      mapEntryError(error) ?? actionFail("ERROR", "Could not save match.")
    );
  }
}

export async function addEmptyMatchAction(
  matchdayId: string,
): Promise<ActionResult<{ matchId: string; matchNo: number }>> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  try {
    const result = await addEmptyMatchAdmin(getDb(), session.userId, matchdayId);
    revalidatePath(`/admin/matchdays/${matchdayId}/entry`);
    return actionOk(result);
  } catch (error) {
    return mapEntryError(error) ?? actionFail("ERROR", "Could not add match.");
  }
}

export async function copyLineupAction(
  matchdayId: string,
  targetMatchId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  try {
    await copyLineupFromPreviousMatchAdmin(
      getDb(),
      session.userId,
      matchdayId,
      targetMatchId,
    );
    revalidatePath(`/admin/matchdays/${matchdayId}/entry`);
    return actionOk();
  } catch (error) {
    return mapEntryError(error) ?? actionFail("ERROR", "Could not copy lineup.");
  }
}

export async function loadMatchdayEntryAction(matchdayId: string) {
  await requireAdmin();
  return loadMatchdayEntry(getDb(), matchdayId);
}
