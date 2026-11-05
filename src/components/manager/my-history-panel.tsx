import Link from "next/link";
import { connection } from "next/server";
import { FantasyTeamCard } from "@/components/manager/fantasy-team-card";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import {
  getManagerMySeasonId,
  getMyHistoricalTeams,
} from "@/server/queries/manager-my-pages";

export async function MyHistoryPanel() {
  await connection();
  const user = await requireUser();
  const seasonId = await getManagerMySeasonId(getDb());
  if (!seasonId) {
    return (
      <EmptyState title="No active season" description="Historical teams need published gameweeks." />
    );
  }

  const history = await getMyHistoricalTeams(getDb(), user.userId, seasonId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Archive"
        title="Gameweek teams"
        description="Every team you fielded once results were published."
      />

      {history.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Published gameweeks will appear here with the squad you scored with."
        />
      ) : (
        <ul className="space-y-8">
          {history.map((entry) => (
            <li key={entry.matchdayId} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold tabular-nums">
                  GW{entry.number}
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground tabular-nums">
                    {entry.playedOn}
                  </span>
                  <Link
                    href={`/my/points/${entry.matchdayId}`}
                    className="font-semibold tabular-nums text-primary hover:underline"
                  >
                    {entry.totalPoints} pts
                  </Link>
                </div>
              </div>
              <FantasyTeamCard team={entry.team} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
