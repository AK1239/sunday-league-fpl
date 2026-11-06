import { connection } from "next/server";
import { GameweekTeam } from "@/components/manager/gameweek-team";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { getManagerScoreLinesByMatchday } from "@/server/queries/manager-score-lines";
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
      <EmptyState
        title="No active season"
        description="Historical teams need published gameweeks."
      />
    );
  }

  const history = await getMyHistoricalTeams(getDb(), user.userId, seasonId);

  const linesByMatchday = await getManagerScoreLinesByMatchday(
    getDb(),
    user.userId,
    history.map((h) => h.matchdayId),
  );

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
        <ul className="space-y-6">
          {history.map((entry) => (
            <li key={entry.matchdayId}>
              <GameweekTeam
                number={entry.number}
                playedOn={entry.playedOn}
                totalPoints={entry.totalPoints}
                team={entry.team}
                lines={linesByMatchday[entry.matchdayId]}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
