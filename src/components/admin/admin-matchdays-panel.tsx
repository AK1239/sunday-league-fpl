import { connection } from "next/server";
import { max, eq } from "drizzle-orm";
import { CreateMatchdayForm } from "@/components/admin/create-matchday-form";
import { MatchdayRowActions } from "@/components/admin/matchday-row-actions";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { matchdays } from "@/server/db/schema";
import { formatDeadlineForDateTimeLocal } from "@/server/domain/deadline";
import {
  getActiveSeasonId,
  listMatchdaysForSeasonAdmin,
} from "@/server/domain/matchdays-admin";
import { getLeagueSettings } from "@/server/domain/league-settings";
import { listSeasonsAdmin } from "@/server/domain/seasons-admin";

function statusClass(status: string): string {
  switch (status) {
    case "scheduled":
      return "text-primary font-medium";
    case "published":
      return "text-foreground font-medium";
    case "cancelled":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export async function AdminMatchdaysPanel() {
  await connection();
  await requireAdmin();

  const db = getDb();
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
    activeSeasonId ?? seasons.find((s) => s.status === "active")?.id ?? seasons[0]?.id;

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

  const seasonName =
    seasons.find((s) => s.id === seasonId)?.name ?? "Season";

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
            description="Create the next Sunday gameweek so managers can pick teams."
          />
        ) : (
          <ul className="space-y-3">
            {matchdayList.map((md) => (
              <li
                key={md.id}
                className="surface flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-heading text-lg font-semibold tabular-nums">
                    GW{md.number}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {md.playedOn} ·{" "}
                    <span className={statusClass(md.status)}>{md.status}</span>
                  </p>
                </div>
                <MatchdayRowActions
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
                  timezone={settings.timezone}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
