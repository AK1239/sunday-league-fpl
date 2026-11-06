import { connection } from "next/server";
import { max, eq } from "drizzle-orm";
import { CreateMatchdayForm } from "@/components/admin/create-matchday-form";
import { MatchdayCard } from "@/components/admin/matchday-card";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { matchdays } from "@/server/db/schema";
import { formatDeadlineForDateTimeLocal } from "@/server/domain/deadline";
import { ensureAutoScheduledMatchday } from "@/server/domain/auto-schedule-matchdays";
import {
  getActiveSeasonId,
  listMatchdaysForSeasonAdmin,
} from "@/server/domain/matchdays-admin";
import { getLeagueSettings } from "@/server/domain/league-settings";
import { listSeasonsAdmin } from "@/server/domain/seasons-admin";

export async function AdminMatchdaysPanel() {
  await connection();
  await requireAdmin();

  const db = getDb();
  await ensureAutoScheduledMatchday(db);
  const [settings, activeSeasonId, seasons] = await Promise.all([
    getLeagueSettings(db),
    getActiveSeasonId(db),
    listSeasonsAdmin(db),
  ]);

  if (!settings) {
    return (
      <EmptyState
        title="League settings missing"
        description="Run database migrations to seed league settings."
      />
    );
  }

  const seasonId =
    activeSeasonId ??
    seasons.find((s) => s.status === "active")?.id ??
    seasons[0]?.id;

  if (!seasonId) {
    return (
      <EmptyState
        title="No season yet"
        description="Create and activate a season before scheduling matchdays."
      />
    );
  }

  const matchdayList = await listMatchdaysForSeasonAdmin(db, seasonId);
  const [{ value: maxNumber }] = await db
    .select({ value: max(matchdays.number) })
    .from(matchdays)
    .where(eq(matchdays.seasonId, seasonId));

  const seasonName = seasons.find((s) => s.id === seasonId)?.name ?? "Season";

  return (
    <div className="space-y-8">
      <CreateMatchdayForm
        seasonId={seasonId}
        timezone={settings.timezone}
        nextNumber={(maxNumber ?? 0) + 1}
      />

      <section>
        <SectionHeading title={`Gameweeks · ${seasonName}`} />
        {matchdayList.length === 0 ? (
          <EmptyState
            title="No matchdays scheduled"
            description="Open gameweeks are created automatically for each Sunday (see docs/AUTO_SCHEDULE_MATCHDAYS.md). Use Cancel on a gameweek if football is called off."
          />
        ) : (
          <ul className="space-y-4">
            {matchdayList.map((md, i) => (
              <MatchdayCard
                key={md.id}
                index={i}
                timezone={settings.timezone}
                matchday={{
                  id: md.id,
                  number: md.number,
                  playedOn: md.playedOn,
                  deadlineLocal: formatDeadlineForDateTimeLocal(
                    md.deadlineAt,
                    settings.timezone,
                  ),
                  status: md.status,
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
