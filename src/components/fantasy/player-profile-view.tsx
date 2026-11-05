import Link from "next/link";
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
        className="inline-flex text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to standings
      </Link>

      <header className="hero-strip flex flex-col items-center rounded-2xl border border-border/60 bg-card/80 px-6 py-8 text-center sm:flex-row sm:items-end sm:gap-6 sm:text-left">
        <PlayerAvatar name={player.displayName} size="xl" />
        <div className="mt-4 sm:mt-0 sm:flex-1">
          <p className="text-sm font-medium text-primary tabular-nums">
            Rank #{profile.rank}
          </p>
          <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight">
            {player.displayName}
          </h1>
          {player.nickname ? (
            <p className="text-muted-foreground">{player.nickname}</p>
          ) : null}
          <p className="font-heading mt-3 text-4xl font-bold tabular-nums text-primary">
            {profile.points}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              fantasy pts
            </span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Appearances" value={profile.appearances} />
        <StatTile label="Goals" value={profile.goals} />
        <StatTile label="Assists" value={profile.assists} />
        <StatTile label="Wins" value={profile.wins} />
        <StatTile label="Win rate" value={`${profile.winRate}%`} />
        <StatTile label="Avg pts" value={profile.averagePoints.toFixed(1)} />
        <StatTile label="MVPs" value={profile.mvpCount} />
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <FormBars values={profile.form} />
      </section>

      <section aria-labelledby="match-history">
        <h2
          id="match-history"
          className="font-heading mb-3 text-lg font-semibold tracking-tight"
        >
          Recent matchdays
        </h2>
        <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
          {profile.recentMatches.map((match) => (
            <li
              key={match.matchday}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
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
            className="font-heading mb-3 text-lg font-semibold tracking-tight"
          >
            Awards &amp; form
          </h2>
          <ul className="flex flex-wrap gap-2">
            {profile.awards.map((award) => (
              <li
                key={award}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
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
