import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PageHeader } from "@/components/fantasy/page-header";
import { GameweekNavigator } from "@/components/manager/gameweek-navigator";
import { GameweekTeam } from "@/components/manager/gameweek-team";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { getManagerFantasyTeamForViewer } from "@/server/queries/fantasy-team-view";
import {
  getManagerMySeasonId,
  getMyPointsGameweeks,
} from "@/server/queries/manager-my-pages";
import { getGameweekDetails } from "@/server/queries/manager-score-lines";

/** Pitch + points for one gameweek. Defaults to the latest published one. */
export async function MyPointsPanel({ matchdayId }: { matchdayId?: string }) {
  await connection();
  const user = await requireUser();
  const db = getDb();
  const seasonId = await getManagerMySeasonId(db);

  const header = (
    <PageHeader
      eyebrow="Season history"
      title="My Points"
      description="Your team and points, gameweek by gameweek."
    />
  );

  if (!seasonId) {
    return (
      <EmptyState
        title="No active season"
        description="Gameweek scores appear after results are published."
      />
    );
  }

  // Newest first from the query; the navigator wants oldest → newest.
  const rows = await getMyPointsGameweeks(db, user.userId, seasonId);
  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          title="No published gameweeks yet"
          description="Your points will show here once the admin publishes Sunday results."
        />
      </div>
    );
  }

  const current = matchdayId
    ? rows.find((r) => r.matchdayId === matchdayId)
    : rows[0];
  if (!current) notFound();

  const [team, details] = await Promise.all([
    getManagerFantasyTeamForViewer(db, current.matchdayId, user.userId, {
      viewerUserId: user.userId,
      viewerRole: "manager",
      targetManagerId: user.userId,
    }),
    getGameweekDetails(db, user.userId, [current.matchdayId]),
  ]);

  const items = [...rows].reverse().map((r) => ({
    matchdayId: r.matchdayId,
    number: r.number,
    totalPoints: r.totalPoints,
  }));

  return (
    <div className="space-y-6">
      {header}
      <GameweekNavigator items={items} currentId={current.matchdayId}>
        <GameweekTeam
          number={current.number}
          playedOn={current.playedOn}
          totalPoints={current.totalPoints}
          rankAfter={current.rankAfter}
          team={team}
          lines={details.lines[current.matchdayId]}
          events={details.events[current.matchdayId]}
          scoreBreakdown={details.scores[current.matchdayId] ?? null}
          emptyTitle="You sat this one out"
          emptyMessage={`You didn't have a team for GW${current.number}, so no points were scored.`}
        />
      </GameweekNavigator>
    </div>
  );
}
