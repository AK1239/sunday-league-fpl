"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import {
  cancelMatchdayAdmin,
  createMatchdayAdmin,
  getActiveSeasonId,
  postponeMatchdayAdmin,
  updateMatchdayDeadlineAdmin,
} from "@/server/domain/matchdays-admin";
import {
  actionFail,
  actionOk,
  type ActionFailure,
  type ActionResult,
} from "./action-result";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  seasonId: z.string().uuid(),
  playedOn: dateSchema,
  number: z.coerce.number().int().min(1).optional(),
  deadlineAtLocal: z.string().trim().optional(),
});

const deadlineSchema = z.object({
  matchdayId: z.string().uuid(),
  deadlineAtLocal: z.string().trim().min(1),
});

const postponeSchema = z.object({
  matchdayId: z.string().uuid(),
  playedOn: dateSchema,
  deadlineAtLocal: z.string().trim().optional(),
});

function mapMatchdayError(error: unknown): ActionFailure | null {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "NO_SETTINGS":
      return actionFail("NO_SETTINGS", "League settings are missing. Run migrations.");
    case "SEASON_NOT_FOUND":
      return actionFail("NOT_FOUND", "Season not found.");
    case "PLAYED_ON_OUT_OF_SEASON":
      return actionFail("VALIDATION", "Date must fall within the season range.");
    case "NOT_FOUND":
      return actionFail("NOT_FOUND", "Matchday not found.");
    case "CANCELLED":
      return actionFail("INVALID_STATE", "This matchday is cancelled.");
    case "PUBLISHED":
      return actionFail(
        "INVALID_STATE",
        "Published matchdays cannot be postponed here. Unpublish from match entry first.",
      );
    case "ALREADY_CANCELLED":
      return actionFail("INVALID_STATE", "Matchday is already cancelled.");
    default:
      return null;
  }
}

export async function createMatchdayAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    seasonId: formData.get("seasonId"),
    playedOn: formData.get("playedOn"),
    number: formData.get("number") || undefined,
    deadlineAtLocal: formData.get("deadlineAtLocal") || undefined,
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Check the matchday date and season.");
  }

  try {
    const row = await createMatchdayAdmin(getDb(), session.userId, parsed.data);
    revalidatePath("/admin/matchdays");
    return actionOk({ id: row.id });
  } catch (error) {
    const mapped = mapMatchdayError(error);
    if (mapped) return mapped;
    return actionFail(
      "CONFLICT",
      "Could not create matchday (duplicate number or date?).",
    );
  }
}

export async function updateMatchdayDeadlineAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = deadlineSchema.safeParse({
    matchdayId: formData.get("matchdayId"),
    deadlineAtLocal: formData.get("deadlineAtLocal"),
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Deadline is required.");
  }

  try {
    await updateMatchdayDeadlineAdmin(
      getDb(),
      session.userId,
      parsed.data.matchdayId,
      parsed.data.deadlineAtLocal,
    );
    revalidatePath("/admin/matchdays");
    return actionOk();
  } catch (error) {
    return mapMatchdayError(error) ?? actionFail("ERROR", "Could not update deadline.");
  }
}

export async function postponeMatchdayAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = postponeSchema.safeParse({
    matchdayId: formData.get("matchdayId"),
    playedOn: formData.get("playedOn"),
    deadlineAtLocal: formData.get("deadlineAtLocal") || undefined,
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Check the new date.");
  }

  try {
    await postponeMatchdayAdmin(getDb(), session.userId, parsed.data.matchdayId, {
      playedOn: parsed.data.playedOn,
      deadlineAtLocal: parsed.data.deadlineAtLocal,
    });
    revalidatePath("/admin/matchdays");
    return actionOk();
  } catch (error) {
    return mapMatchdayError(error) ?? actionFail("ERROR", "Could not postpone matchday.");
  }
}

export async function cancelMatchdayAction(
  matchdayId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!z.string().uuid().safeParse(matchdayId).success) {
    return actionFail("VALIDATION", "Invalid matchday.");
  }

  try {
    await cancelMatchdayAdmin(getDb(), session.userId, matchdayId);
    revalidatePath("/admin/matchdays");
    revalidatePath("/table");
    return actionOk();
  } catch (error) {
    return mapMatchdayError(error) ?? actionFail("ERROR", "Could not cancel matchday.");
  }
}

export async function getActiveSeasonIdAction(): Promise<string | null> {
  await requireAdmin();
  return getActiveSeasonId(getDb());
}
