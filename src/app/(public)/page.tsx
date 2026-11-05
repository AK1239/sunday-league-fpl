import {
  ArrowRight,
  CalendarClock,
  Footprints,
  Medal,
  Target,
} from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/fantasy/count-up";
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
      <header className="animate-rise space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          {MOCK_SEASON.name}
        </p>
        <h1 className="font-heading text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
          <span className="text-gradient">{LEAGUE_NAME}</span>
        </h1>
        <p className="text-muted-foreground">
          {leader.player.displayName} leads with{" "}
          <span className="font-semibold text-foreground tabular-nums">
            <CountUp value={leader.points} /> pts
          </span>
          {" · "}
          {MOCK_SEASON.daysRemaining} days left in the season
        </p>
      </header>

      <PodiumHero topThree={topThree} />

      <section
        aria-labelledby="latest-md"
        className="animate-rise"
        style={{ "--d": "250ms" } as React.CSSProperties}
      >
        <SectionHeading
          title={`Matchday ${MOCK_LATEST_MATCHDAY.number}`}
          action={
            <Link
              href="/matchdays"
              className="group inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              All matchdays
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
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

      <div
        className="animate-rise grid gap-4 sm:grid-cols-2"
        style={{ "--d": "350ms" } as React.CSSProperties}
      >
        <section className="surface rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <Medal className="size-4 text-podium-gold" aria-hidden />
            Player of the week
          </h2>
          {potw ? (
            <Link
              href={`/players/${potw.id}`}
              className="group mt-3 flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <section className="surface relative overflow-hidden rounded-2xl p-5">
          <div
            aria-hidden
            className="absolute -top-10 -right-10 size-36 rounded-full bg-primary/15 blur-2xl"
          />
          <h2 className="relative flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <CalendarClock className="size-4 text-primary" aria-hidden />
            Next Sunday
          </h2>
          <p className="relative mt-3 font-heading text-3xl font-bold">
            Matchday 9
          </p>
          <p className="relative text-sm text-muted-foreground">
            Kickoff at the usual pitch
          </p>
        </section>
      </div>

      <div
        className="animate-rise grid gap-4 sm:grid-cols-2"
        style={{ "--d": "450ms" } as React.CSSProperties}
      >
        <LeaderMini
          icon={<Target className="size-4" aria-hidden />}
          title="Golden Boot"
          name={goldenBoot.player.displayName}
          stat={`${goldenBoot.goals} goals`}
          href={`/players/${goldenBoot.player.id}`}
        />
        <LeaderMini
          icon={<Footprints className="size-4" aria-hidden />}
          title="Playmaker"
          name={playmaker.player.displayName}
          stat={`${playmaker.assists} assists`}
          href={`/players/${playmaker.player.id}`}
        />
      </div>

      <section
        aria-labelledby="recent-achievements"
        className="animate-rise"
        style={{ "--d": "550ms" } as React.CSSProperties}
      >
        <SectionHeading title="Recent highlights" />
        <ul className="space-y-2">
          {MOCK_ACHIEVEMENTS.map((item) => {
            const player = getPlayerById(item.playerId);
            return (
              <li
                key={item.id}
                className="surface flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
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
  icon,
  title,
  name,
  stat,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  name: string;
  stat: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="surface surface-hover block rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      <p className="mt-3 text-lg font-semibold">{name}</p>
      <p className="font-heading text-2xl font-bold tabular-nums text-primary">
        {stat}
      </p>
    </Link>
  );
}
