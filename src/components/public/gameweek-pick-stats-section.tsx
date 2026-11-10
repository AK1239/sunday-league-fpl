import { Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { SelectedBy } from "@/components/pick/selected-by";
import { CaptainBadge } from "@/components/pick/captain-badge";
import type { PublicGameweekPickStats } from "@/server/queries/gameweek-pick-stats";

export function GameweekPickStatsSection({
  stats,
}: {
  stats: PublicGameweekPickStats;
}) {
  return (
    <section aria-labelledby="gw-pick-stats" className="animate-rise space-y-4">
      <SectionHeading title={`Gameweek ${stats.number} picks`} />
      <p className="-mt-2 mb-1 text-sm text-muted-foreground">
        How managers lined up after the deadline.
      </p>

      <div className="surface space-y-5 rounded-2xl p-5">
        <ul className="grid gap-3 sm:grid-cols-3">
          {stats.topCaptain ? (
            <li>
              <PickLeaderCard
                stat={stats.topCaptain}
                teamsCount={stats.teamsCount}
                label="Most captained"
                badge={<CaptainBadge role="captain" className="shadow-sm" />}
              />
            </li>
          ) : null}
          {stats.topViceCaptain ? (
            <li>
              <PickLeaderCard
                stat={stats.topViceCaptain}
                teamsCount={stats.teamsCount}
                label="Most vice-captained"
                badge={
                  <CaptainBadge role="vice_captain" className="shadow-sm" />
                }
              />
            </li>
          ) : null}
          {stats.topSelected[0] ? (
            <li>
              <PickLeaderCard
                stat={stats.topSelected[0]}
                teamsCount={stats.teamsCount}
                label="Most selected"
                badge={
                  <span
                    className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground ring-2 ring-background"
                    aria-hidden
                  >
                    %
                  </span>
                }
              />
            </li>
          ) : null}
        </ul>

        {stats.topSelected.length > 1 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Top picks
            </h3>
            <ul className="space-y-2">
              {stats.topSelected.map((row, index) => (
                <li key={row.playerId}>
                  <Link
                    href={`/players/${row.playerId}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted/30 px-3 py-2.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:flex-nowrap"
                  >
                    <span
                      className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <PlayerShirt
                      name={row.displayName}
                      kitKey={row.kitKey}
                      size="sm"
                      className="shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {row.displayName}
                    </span>
                    <SelectedBy percent={row.percent} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" aria-hidden />
            <span className="tabular-nums">
              {stats.teamsCount} team{stats.teamsCount === 1 ? "" : "s"} locked
              in
            </span>
          </span>
          <span className="tabular-nums">
            {stats.uniqueCaptains} unique captain
            {stats.uniqueCaptains === 1 ? "" : "s"}
          </span>
          {stats.differential &&
          stats.topSelected[0] &&
          stats.differential.playerId !== stats.topSelected[0].playerId ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Differential:{" "}
              <Link
                href={`/players/${stats.differential.playerId}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {stats.differential.displayName}
              </Link>{" "}
              <span className="tabular-nums">
                ({stats.differential.percent}%)
              </span>
            </span>
          ) : null}
        </footer>
      </div>
    </section>
  );
}

function PickLeaderCard({
  stat,
  teamsCount,
  label,
  badge,
}: {
  stat: PublicGameweekPickStats["topCaptain"] & object;
  teamsCount: number;
  label: string;
  badge: React.ReactNode;
}) {
  return (
    <Link
      href={`/players/${stat.playerId}`}
      className="surface-hover flex h-full flex-col items-center rounded-xl bg-muted/25 px-4 py-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <div className="relative mt-3">
        <PlayerShirt name={stat.displayName} kitKey={stat.kitKey} size="lg" />
        <span className="absolute -top-1 -right-3">{badge}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug">
        {stat.displayName}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-primary">
        {stat.percent}%
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {stat.count} of {teamsCount} teams
      </p>
    </Link>
  );
}
