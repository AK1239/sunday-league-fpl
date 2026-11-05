import Link from "next/link";
import { connection } from "next/server";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PageHeader } from "@/components/fantasy/page-header";
import { LEAGUE_NAME } from "@/lib/league";
import { getDb } from "@/server/db";
import { getAwardsHall } from "@/server/queries/public-awards";

export async function AwardsPanel() {
  await connection();
  const archive = await getAwardsHall(getDb());

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={LEAGUE_NAME}
        title="Awards & archive"
        description="Season champions and stat leaders from closed seasons."
      />

      {archive.length === 0 ? (
        <EmptyState
          icon={<Trophy className="mx-auto size-10 text-muted-foreground" />}
          title="No closed seasons yet"
          description="When an admin closes a season, winners are recorded here automatically."
        />
      ) : (
        <ul className="space-y-6">
          {archive.map((season) => (
            <li key={season.seasonId} className="surface rounded-2xl p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold">
                  {season.seasonName}
                </h2>
                {season.closedAt ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Closed {season.closedAt}
                  </p>
                ) : null}
              </div>
              {season.awards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No awards recorded for this season.
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {season.awards.map((award) => (
                    <li
                      key={award.award}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {award.label}
                      </span>
                      <Link
                        href={award.href}
                        className="font-medium text-primary hover:underline"
                      >
                        {award.winnerName}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {award.valueLabel}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
