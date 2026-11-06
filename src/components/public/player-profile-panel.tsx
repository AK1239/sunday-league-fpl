import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/fantasy/count-up";
import { FormBars } from "@/components/fantasy/form-bars";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { StatTile } from "@/components/fantasy/stat-tile";
import { getDb } from "@/server/db";
import { getPlayerPublicProfile } from "@/server/queries/public-players";

export async function PlayerProfilePanel({ playerId }: { playerId: string }) {
  await connection();
  const profile = await getPlayerPublicProfile(getDb(), playerId);
  if (!profile) notFound();

  const { player } = profile;

  return (
    <div className="space-y-8">
      <Link
        href="/players"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-4 transition-transform group-hover:-translate-x-1"
          aria-hidden
        />
        Back to player standings
      </Link>

      <header className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-border/60 bg-card/60 px-6 py-10 text-center sm:flex-row sm:items-end sm:gap-6 sm:text-left">
        <div className="relative">
          <PlayerShirt
            name={player.displayName}
            kitKey={player.kitKey}
            size="xl"
            className="w-28"
          />
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
          {profile.pickedByManagers != null && profile.pickedByManagers > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Picked by {profile.pickedByManagers} manager
              {profile.pickedByManagers === 1 ? "" : "s"} (latest GW)
            </p>
          ) : null}
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
        ].map(([label, value]) => (
          <StatTile key={String(label)} label={String(label)} value={value} />
        ))}
      </div>

      {profile.form.length > 0 ? (
        <section className="surface rounded-2xl p-5">
          <FormBars values={profile.form} />
        </section>
      ) : null}

      <section aria-labelledby="match-history">
        <h2
          id="match-history"
          className="font-heading mb-3 text-xl font-semibold tracking-tight"
        >
          Recent gameweeks
        </h2>
        {profile.recentMatchdays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published scores yet.
          </p>
        ) : (
          <ul className="surface divide-y divide-border/40 overflow-hidden rounded-2xl">
            {profile.recentMatchdays.map((md) => (
              <li key={md.matchdayId}>
                <Link
                  href={`/matchdays/${md.matchdayId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-primary/5"
                >
                  <div>
                    <p className="font-medium tabular-nums">GW{md.number}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {md.playedOn}
                    </p>
                  </div>
                  <span className="font-heading text-lg font-semibold tabular-nums text-primary">
                    {md.points} pts
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
