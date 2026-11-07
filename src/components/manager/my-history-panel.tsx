import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GameweekNavigator } from "@/components/manager/gameweek-navigator";
import { GameweekTeam } from "@/components/manager/gameweek-team";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { getGameweekDetails } from "@/server/queries/manager-score-lines";
import {
  getManagerMySeasonId,
  getMyHistoricalTeams,
} from "@/server/queries/manager-my-pages";

/** One published gameweek team. Defaults to the latest. */
export async function MyHistoryPanel({
  matchdayId,
}: {
  matchdayId?: string;
}) {
  await connection();
  const user = await requireUser();
  const db = getDb();
  const seasonId = await getManagerMySeasonId(db);

  const header = (
    <PageHeader
      eyebrow="Archive"
      title="Gameweek teams"
      description="Every team you fielded once results were published."
    />
  );

  if (!seasonId) {
    return (
      <EmptyState
        title="No active season"
        description="Historical teams need published gameweeks."
      />
    );
  }

  const history = await getMyHistoricalTeams(db, user.userId, seasonId);

  if (history.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          title="No history yet"
          description="Published gameweeks will appear here with the squad you scored with."
        />
      </div>
    );
  }

  const current = matchdayId
    ? history.find((h) => h.matchdayId === matchdayId)
    : history[0];
  if (!current) notFound();

  const details = await getGameweekDetails(db, user.userId, [
    current.matchdayId,
  ]);

  const items = [...history].reverse().map((h) => ({
    matchdayId: h.matchdayId,
    number: h.number,
    totalPoints: h.totalPoints,
  }));

  return (
    <div className="space-y-6">
      {header}
      <GameweekNavigator
        items={items}
        currentId={current.matchdayId}
        basePath="/my/history"
      >
        <GameweekTeam
          number={current.number}
          playedOn={current.playedOn}
          totalPoints={current.totalPoints}
          team={current.team}
          lines={details.lines[current.matchdayId]}
          events={details.events[current.matchdayId]}
          scoreBreakdown={details.scores[current.matchdayId]}
        />
      </GameweekNavigator>
    </div>
  );
}
