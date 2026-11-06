"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { CHIP_CODES } from "@/server/chips/registry";
import {
  AdminChipsError,
  forceActivateChipAdmin,
  updateSeasonChipsAdmin,
  voidChipPlayAdmin,
} from "@/server/domain/admin-chips";
import { actionFail, actionOk, type ActionResult } from "./action-result";

const voidSchema = z.object({
  playId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export async function voidChipPlayAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = voidSchema.safeParse({
    playId: formData.get("playId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return actionFail("VALIDATION", "Play id and a reason are required.");
  }

  try {
    await voidChipPlayAdmin(
      getDb(),
      session.userId,
      parsed.data.playId,
      parsed.data.reason,
    );
    revalidatePath("/admin/chips");
    revalidatePath("/pick");
    return actionOk();
  } catch (error) {
    if (error instanceof AdminChipsError) {
      return actionFail(error.code, error.message);
    }
    throw error;
  }
}

const forceSchema = z.object({
  managerId: z.string().uuid(),
  matchdayId: z.string().uuid(),
  chipCode: z.enum(CHIP_CODES),
  reason: z.string().min(3).max(500),
});

export async function forceActivateChipAction(
  formData: FormData,
): Promise<ActionResult<{ playId: string }>> {
  const session = await requireAdmin();
  const parsed = forceSchema.safeParse({
    managerId: formData.get("managerId"),
    matchdayId: formData.get("matchdayId"),
    chipCode: formData.get("chipCode"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Check manager, gameweek, chip, and reason.",
    );
  }

  try {
    const result = await forceActivateChipAdmin(
      getDb(),
      session.userId,
      parsed.data,
    );
    revalidatePath("/admin/chips");
    revalidatePath("/pick");
    return actionOk(result);
  } catch (error) {
    if (error instanceof AdminChipsError) {
      return actionFail(error.code, error.message);
    }
    throw error;
  }
}

const seasonChipsSchema = z.object({
  seasonId: z.string().uuid(),
  rows: z.array(
    z.object({
      chipCode: z.enum(CHIP_CODES),
      enabled: z.coerce.boolean().optional(),
      availableFromMatchday: z.coerce.number().int().min(1).optional(),
    }),
  ),
});

export async function updateSeasonChipsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const seasonId = formData.get("seasonId");
  const rawRows = formData.get("rows");
  if (typeof seasonId !== "string" || typeof rawRows !== "string") {
    return actionFail("VALIDATION", "Missing season or chip rows.");
  }

  let rows: unknown;
  try {
    rows = JSON.parse(rawRows);
  } catch {
    return actionFail("VALIDATION", "Invalid chip configuration payload.");
  }

  const parsed = seasonChipsSchema.safeParse({ seasonId, rows });
  if (!parsed.success) {
    return actionFail("VALIDATION", "Invalid chip configuration.");
  }

  try {
    await updateSeasonChipsAdmin(
      getDb(),
      session.userId,
      parsed.data.seasonId,
      parsed.data.rows,
    );
    revalidatePath("/admin/chips");
    revalidatePath("/pick");
    return actionOk();
  } catch (error) {
    if (error instanceof AdminChipsError) {
      return actionFail(error.code, error.message);
    }
    throw error;
  }
}
