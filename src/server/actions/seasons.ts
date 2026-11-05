"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/server/db";
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
      return actionFail("SEASON_CLOSED", "Closed seasons cannot be reactivated.");
    }
    throw error;
  }
}
