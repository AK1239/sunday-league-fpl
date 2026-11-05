import Link from "next/link";
import { PodiumHero } from "@/components/fantasy/podium-hero";
import { ScoreCard } from "@/components/fantasy/score-card";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { LEAGUE_NAME } from "@/lib/league";
import {
  getGoldenBootLeader,
  getMockStandings,
  getPlaymakerLeader,
  getPlayerById,
  MOCK_ACHIEVEMENTS,
  MOCK_LATEST_MATCHDAY,
  MOCK_SEASON,
} from "@/lib/mock/data";

export default function HomePage() {
  const standings = getMockStandings();
  const topThree = standings.slice(0, 3);
  const leader = standings[0]!;
  const goldenBoot = getGoldenBootLeader();
  const playmaker = getPlaymakerLeader();
  const potw = getPlayerById(MOCK_LATEST_MATCHDAY.playerOfWeekId);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {MOCK_SEASON.name}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {LEAGUE_NAME}
        </h1>
        <p className="text-sm text-muted-foreground">
          {leader.player.displayName} leads with{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {leader.points} pts
          </span>
          {" · "}
          {MOCK_SEASON.daysRemaining} days left in the season
        </p>
      </header>

      <PodiumHero topThree={topThree} />

      <section aria-labelledby="latest-md">
        <SectionHeading
          title={`Matchday ${MOCK_LATEST_MATCHDAY.number}`}
          action={
            <Link
              href="/matchdays"
              className="text-sm font-medium text-primary hover:underline"
            >
              All matchdays
            </Link>
          }
        />
        <p className="mb-3 text-sm text-muted-foreground">
          {new Date(MOCK_LATEST_MATCHDAY.playedOn).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </p>
        <ul className="space-y-2">
          {MOCK_LATEST_MATCHDAY.matches.map((match) => (
            <li key={match.id}>
              <ScoreCard teamA={match.teamA} teamB={match.teamB} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Player of the week
          </h2>
          {potw ? (
            <Link
              href={`/players/${potw.id}`}
              className="mt-3 flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlayerAvatar name={potw.displayName} size="lg" />
              <div>
                <p className="font-semibold">{potw.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  Matchday 8 standout
                </p>
              </div>
            </Link>
          ) : null}
        </section>
        <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Next Sunday
          </h2>
          <p className="mt-3 font-heading text-2xl font-bold">Matchday 9</p>
          <p className="text-sm text-muted-foreground">
            Kickoff at the usual pitch
          </p>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LeaderMini
          title="Golden Boot"
          name={goldenBoot.player.displayName}
          stat={`${goldenBoot.goals} goals`}
          href={`/players/${goldenBoot.player.id}`}
        />
        <LeaderMini
          title="Playmaker"
          name={playmaker.player.displayName}
          stat={`${playmaker.assists} assists`}
          href={`/players/${playmaker.player.id}`}
        />
      </div>

      <section aria-labelledby="recent-achievements">
        <SectionHeading title="Recent highlights" />
        <ul className="space-y-2">
          {MOCK_ACHIEVEMENTS.map((item) => {
            const player = getPlayerById(item.playerId);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5 text-sm"
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {player?.displayName} · {item.detail}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function LeaderMini({
  title,
  name,
  stat,
  href,
}: {
  title: string;
  name: string;
  stat: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border/60 bg-card/70 p-4 outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 font-semibold">{name}</p>
      <p className="text-sm tabular-nums text-primary">{stat}</p>
    </Link>
  );
}
