import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/fantasy/count-up";
import { notFound } from "next/navigation";
import { FormBars } from "@/components/fantasy/form-bars";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { StatTile } from "@/components/fantasy/stat-tile";
import { getMockPlayer } from "@/lib/mock/data";

export async function PlayerProfileView({
  params,
}: {
  params: PageProps<"/players/[id]">["params"];
}) {
  const { id } = await params;
  const profile = getMockPlayer(id);
  if (!profile) notFound();

  const { player } = profile;

  return (
    <div className="space-y-8">
      <Link
        href="/table"
        className="group animate-fade inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-4 transition-transform group-hover:-translate-x-1"
          aria-hidden
        />
        Back to standings
      </Link>

      <header className="animate-rise relative flex flex-col items-center overflow-hidden rounded-3xl border border-border/60 bg-card/60 px-6 py-10 text-center sm:flex-row sm:items-end sm:gap-6 sm:text-left">
        <div
          aria-hidden
          className="animate-float absolute -top-20 -left-10 size-72 rounded-full bg-primary/20 blur-[90px]"
        />
        <div
          aria-hidden
          className="hero-strip pointer-events-none absolute inset-0"
        />
        <div className="relative rounded-full ring-4 ring-primary/20">
          <PlayerAvatar name={player.displayName} size="xl" />
        </div>
        <div className="relative mt-4 sm:mt-0 sm:flex-1">
          <p className="inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
            Rank #{profile.rank}
          </p>
          <h1 className="font-heading mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            {player.displayName}
          </h1>
          {player.nickname ? (
            <p className="text-muted-foreground">{player.nickname}</p>
          ) : null}
          <p className="font-heading mt-3 text-5xl font-bold tabular-nums text-primary">
            <CountUp value={profile.points} />
            <span className="ml-2 text-base font-normal text-muted-foreground">
              fantasy pts
            </span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[
          ["Appearances", profile.appearances],
          ["Goals", profile.goals],
          ["Assists", profile.assists],
          ["Wins", profile.wins],
          ["Win rate", `${profile.winRate}%`],
          ["Avg pts", profile.averagePoints.toFixed(1)],
          ["MVPs", profile.mvpCount],
        ].map(([label, value], i) => (
          <StatTile
            key={label}
            label={String(label)}
            value={value}
            style={{ "--d": `${150 + i * 60}ms` } as React.CSSProperties}
          />
        ))}
      </div>

      <section
        className="surface animate-rise rounded-2xl p-5"
        style={{ "--d": "300ms" } as React.CSSProperties}
      >
        <FormBars values={profile.form} />
      </section>

      <section aria-labelledby="match-history">
        <h2
          id="match-history"
          className="font-heading mb-3 text-xl font-semibold tracking-tight"
        >
          Recent matchdays
        </h2>
        <ul className="surface divide-y divide-border/40 overflow-hidden rounded-2xl">
          {profile.recentMatches.map((match) => (
            <li
              key={match.matchday}
              className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-primary/5"
            >
              <div>
                <p className="font-medium">Matchday {match.matchday}</p>
                <p className="text-muted-foreground">{match.summary}</p>
              </div>
              <span className="font-heading text-lg font-semibold tabular-nums text-primary">
                +{match.points}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {profile.awards.length > 0 ? (
        <section aria-labelledby="awards">
          <h2
            id="awards"
            className="font-heading mb-3 text-xl font-semibold tracking-tight"
          >
            Awards &amp; form
          </h2>
          <ul className="flex flex-wrap gap-2">
            {profile.awards.map((award) => (
              <li
                key={award}
                className="animate-pop rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-sm font-medium text-primary"
              >
                {award}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
