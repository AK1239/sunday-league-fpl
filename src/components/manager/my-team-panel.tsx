import Link from "next/link";
import { connection } from "next/server";
import { FantasyTeamCard } from "@/components/manager/fantasy-team-card";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
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
            emptyTitle="Your lineup is empty"
            emptyMessage="Pick your five and choose a captain before the deadline — it only takes a minute."
            emptyAction={{ href: "/pick", label: "Pick your team" }}
          />
        </section>
      ) : null}

      {data.latestPublished ? (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              Latest result · GW{data.latestPublished.number}
            </h2>
            <p className="text-sm text-muted-foreground">
              {data.latestPublished.playedOn}
              {data.latestPublished.totalPoints != null
                ? ` · ${data.latestPublished.totalPoints} pts`
                : null}
            </p>
          </div>
          <FantasyTeamCard
            team={data.latestPublished.team}
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
