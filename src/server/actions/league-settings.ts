"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { writeAuditLog } from "@/server/domain/audit-log";
import {
  getLeagueSettings,
  updateLeagueSettingsAdmin,
  type LeagueSettingsRow,
} from "@/server/domain/league-settings";
import { actionFail, actionOk, type ActionResult } from "./action-result";

const settingsSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  defaultKickoffTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  deadlineOffsetMinutes: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 60),
});

export async function getLeagueSettingsAction(): Promise<LeagueSettingsRow | null> {
  await requireAdmin();
  return getLeagueSettings(getDb());
}

export async function updateLeagueSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const kickoffRaw = String(formData.get("defaultKickoffTime") ?? "");
  const kickoff = kickoffRaw.length === 5 ? `${kickoffRaw}:00` : kickoffRaw;

  const parsed = settingsSchema.safeParse({
    timezone: formData.get("timezone"),
    defaultKickoffTime: kickoff,
    deadlineOffsetMinutes: formData.get("deadlineOffsetMinutes"),
  });

  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Check timezone, kickoff time, and offset.",
    );
  }

  const db = getDb();
  const before = await getLeagueSettings(db);
  if (!before) {
    return actionFail("NO_SETTINGS", "League settings row is missing.");
  }

  try {
    const after = await updateLeagueSettingsAdmin(db, parsed.data);
    await writeAuditLog(db, {
      userId: session.userId,
      action: "update",
      entity: "league_settings",
      entityId: after.id,
      before,
      after,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/matchdays");
    return actionOk();
  } catch {
    return actionFail("ERROR", "Could not save settings.");
  }
}
