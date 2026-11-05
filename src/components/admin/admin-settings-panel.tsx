import { connection } from "next/server";
import { LeagueSettingsForm } from "@/components/admin/league-settings-form";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { getLeagueSettings } from "@/server/domain/league-settings";

export async function AdminSettingsPanel() {
  await connection();
  await requireAdmin();

  const settings = await getLeagueSettings(getDb());
  if (!settings) {
    return (
      <EmptyState
        title="League settings missing"
        description="Apply migrations to create the league_settings row."
      />
    );
  }

  return (
    <LeagueSettingsForm
      timezone={settings.timezone}
      defaultKickoffTime={settings.defaultKickoffTime}
      deadlineOffsetMinutes={settings.deadlineOffsetMinutes}
    />
  );
}
