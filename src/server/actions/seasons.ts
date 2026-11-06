"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/server/db";
import { closeSeasonAdmin } from "@/server/domain/close-season";
import {
  EnableSeasonChipsError,
  enableChipsForSeason,
} from "@/server/domain/enable-season-chips";
import {
  activateSeasonAdmin,
  createSeasonAdmin,
} from "@/server/domain/seasons-admin";
import { requireAdmin } from "@/server/auth/require-admin";
import { actionFail, actionOk, type ActionResult } from "./action-result";

const seasonSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((value) => value.endsOn > value.startsOn, {
    message: "End date must be after start date",
    path: ["endsOn"],
  });

export async function createSeasonAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Check season dates and name.", {
      endsOn: parsed.error.flatten().fieldErrors.endsOn?.[0] ?? "",
    });
  }

  try {
    const season = await createSeasonAdmin(getDb(), parsed.data);
    revalidatePath("/admin/seasons");
    return actionOk({ id: season.id });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_RULE_SET") {
      return actionFail("NO_RULE_SET", "Create a scoring rule set first.");
    }
    return actionFail(
      "CONFLICT",
      "Season dates overlap an existing season or are invalid.",
    );
  }
}

export async function activateSeasonAction(
  seasonId: string,
): Promise<ActionResult> {
  await requireAdmin();

  try {
    await activateSeasonAdmin(getDb(), seasonId);
    revalidatePath("/admin/seasons");
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return actionFail("NOT_FOUND", "Season not found.");
    }
    if (error instanceof Error && error.message === "SEASON_CLOSED") {
      return actionFail(
        "SEASON_CLOSED",
        "Closed seasons cannot be reactivated.",
      );
    }
    throw error;
  }
}

export async function closeSeasonAction(
  seasonId: string,
): Promise<ActionResult> {
  await requireAdmin();

  try {
    await closeSeasonAdmin(getDb(), seasonId);
    revalidatePath("/admin/seasons");
    revalidatePath("/awards");
    revalidatePath("/table");
    revalidatePath("/players");
    revalidatePath("/");
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return actionFail("NOT_FOUND", "Season not found.");
    }
    if (error instanceof Error && error.message === "NOT_ACTIVE") {
      return actionFail(
        "NOT_ACTIVE",
        "Only the active season can be closed.",
      );
    }
    throw error;
  }
}

const enableChipsSchema = z.object({
  seasonId: z.string().uuid(),
  availableFromMatchday: z.coerce.number().int().min(1).optional(),
});

export async function enableSeasonChipsAction(
  formData: FormData,
): Promise<
  ActionResult<{ availableFromMatchday: number; chipCount: number }>
> {
  const session = await requireAdmin();

  const parsed = enableChipsSchema.safeParse({
    seasonId: formData.get("seasonId"),
    availableFromMatchday: formData.get("availableFromMatchday") || undefined,
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Invalid season or gameweek.");
  }

  try {
    const result = await enableChipsForSeason(
      getDb(),
      session.userId,
      parsed.data.seasonId,
      parsed.data.availableFromMatchday != null
        ? { availableFromMatchday: parsed.data.availableFromMatchday }
        : undefined,
    );
    revalidatePath("/admin/seasons");
    return actionOk(result);
  } catch (error) {
    if (error instanceof EnableSeasonChipsError) {
      return actionFail(error.code, error.message);
    }
    throw error;
  }
}
