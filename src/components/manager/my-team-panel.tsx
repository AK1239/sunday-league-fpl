import Link from "next/link";
import { connection } from "next/server";
import { FantasyTeamCard } from "@/components/manager/fantasy-team-card";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { GameweekTeam } from "@/components/manager/gameweek-team";
import { getGameweekDetails } from "@/server/queries/manager-score-lines";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { isSelectionOpen } from "@/server/fantasy/lock";
import { getMyTeamPageData } from "@/server/queries/manager-my-pages";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function MyTeamPanel() {
  await connection();
  const user = await requireUser();
  const data = await getMyTeamPageData(getDb(), user.userId);

  if (!data) {
    return (
      <EmptyState
        title="No active season"
        description="When a season is active, your team and points will show here."
      />
    );
  }

  const latestId = data.latestPublished?.matchdayId;
  const details = latestId
    ? await getGameweekDetails(getDb(), user.userId, [latestId])
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={data.seasonName}
        title="My Team"
        description={`Season total · ${data.seasonTotalPoints} pts`}
      />

      {data.upcoming ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Upcoming · GW{data.upcoming.number}
              </h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {data.upcoming.playedOn}
              </p>
            </div>
            <Link href="/pick" className={cn(buttonVariants({ size: "sm" }))}>
              Pick Team
            </Link>
          </div>
          <FantasyTeamCard
            team={data.upcoming.team}
            matchdayId={data.upcoming.matchdayId}
            picksOpen={isSelectionOpen(
              {
                status: data.upcoming.status,
                deadlineAt: data.upcoming.deadlineAt,
              },
              new Date(),
            )}
            emptyTitle="Your lineup is empty"
            emptyMessage="Pick your five and choose a captain before the deadline — it only takes a minute."
            emptyAction={{ href: "/pick", label: "Pick your team" }}
          />
        </section>
      ) : null}

      {data.latestPublished ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">Latest result</h2>
          <GameweekTeam
            number={data.latestPublished.number}
            playedOn={data.latestPublished.playedOn}
            totalPoints={data.latestPublished.totalPoints}
            team={data.latestPublished.team}
            lines={latestId ? details?.lines[latestId] : undefined}
            events={latestId ? details?.events[latestId] : undefined}
            emptyTitle="You sat this one out"
            emptyMessage={`You didn't have a team for GW${data.latestPublished.number}, so no points were scored. Set yours early next time.`}
          />
        </section>
      ) : null}

      {!data.upcoming && !data.latestPublished ? (
        <EmptyState
          title="Nothing to show yet"
          description="Schedule a gameweek or publish results to see your team here."
        />
      ) : null}
    </div>
  );
}
