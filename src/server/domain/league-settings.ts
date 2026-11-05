import { eq } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import { leagueSettings } from "@/server/db/schema";

export type LeagueSettingsRow = {
  id: string;
  timezone: string;
  defaultKickoffTime: string;
  deadlineOffsetMinutes: number;
};

export async function getLeagueSettings(
  db: DbExecutor,
): Promise<LeagueSettingsRow | null> {
  const rows = await db.select().from(leagueSettings).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    timezone: row.timezone,
    defaultKickoffTime: row.defaultKickoffTime,
    deadlineOffsetMinutes: row.deadlineOffsetMinutes,
  };
}

export async function updateLeagueSettingsAdmin(
  db: AppDb,
  input: {
    timezone: string;
    defaultKickoffTime: string;
    deadlineOffsetMinutes: number;
  },
): Promise<LeagueSettingsRow> {
  const existing = await getLeagueSettings(db);
  if (!existing) {
    throw new Error("NO_SETTINGS");
  }

  const [updated] = await db
    .update(leagueSettings)
    .set({
      timezone: input.timezone.trim(),
      defaultKickoffTime: input.defaultKickoffTime,
      deadlineOffsetMinutes: input.deadlineOffsetMinutes,
    })
    .where(eq(leagueSettings.id, existing.id))
    .returning();

  return {
    id: updated!.id,
    timezone: updated!.timezone,
    defaultKickoffTime: updated!.defaultKickoffTime,
    deadlineOffsetMinutes: updated!.deadlineOffsetMinutes,
  };
}
