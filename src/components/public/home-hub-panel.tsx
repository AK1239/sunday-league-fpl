import {
  ArrowRight,
  CalendarClock,
  Footprints,
  Medal,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { CountUp } from "@/components/fantasy/count-up";
import { EmptyState } from "@/components/fantasy/empty-state";
import { ManagerPodiumHero } from "@/components/fantasy/manager-podium-hero";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { ScoreCard } from "@/components/fantasy/score-card";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { LEAGUE_NAME } from "@/lib/league";
import { getDb } from "@/server/db";
import { getPublicHomeData } from "@/server/queries/public-competition";

export async function HomeHubPanel() {
  await connection();
  const data = await getPublicHomeData(getDb());

  if (!data) {
    return (
      <EmptyState
        title="League not ready"
        description="An active season and matchdays are needed before the hub can show live data."
      />
    );
  }

  const topThree = data.managerStandings.slice(0, 3);
  const leader = data.managerStandings[0];

  return (
    <div className="space-y-8">
      <header className="animate-rise space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
          <Trophy className="size-3.5" aria-hidden />
          {data.seasonName}
        </p>
        <h1 className="font-heading text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
          <span className="text-gradient">{LEAGUE_NAME}</span>
        </h1>
        <p className="text-muted-foreground">
          {leader ? (
            <>
              {leader.displayName} leads the manager table with{" "}
              <span className="font-semibold text-foreground tabular-nums">
                <CountUp value={leader.totalPoints} /> pts
              </span>
            </>
          ) : (
            "Manager competition — pick five each Sunday."
          )}
        </p>
      </header>

      <ManagerPodiumHero topThree={topThree} />

      {data.latestPublished ? (
        <section aria-labelledby="latest-md" className="animate-rise">
          <SectionHeading
            title={`Gameweek ${data.latestPublished.number}`}
            action={
              <Link
                href={`/matchdays/${data.latestPublished.id}`}
                className="group inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Full gameweek
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            }
          />
          <p className="mb-3 text-sm text-muted-foreground tabular-nums">
            {data.latestPublished.playedOn}
            {data.latestPublished.topManager ? (
              <>
                {" · "}
                <Link
                  href={`/managers/${data.latestPublished.topManager.managerId}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {data.latestPublished.topManager.displayName}
                </Link>{" "}
                top scorer ({data.latestPublished.topManager.totalPoints} pts)
              </>
            ) : null}
          </p>
          {data.latestPublished.matches.length > 0 ? (
            <ul className="space-y-2">
              {data.latestPublished.matches.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/matchdays/${data.latestPublished!.id}/matches/${match.id}`}
                    className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ScoreCard
                      teamA={{ name: "Side A", score: match.scoreA }}
                      teamB={{ name: "Side B", score: match.scoreB }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No matches recorded.</p>
          )}
        </section>
      ) : null}

      <div className="animate-rise grid gap-4 sm:grid-cols-2">
        <section className="surface rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <Medal className="size-4 text-podium-gold" aria-hidden />
            Player of the week
          </h2>
          {data.latestPublished?.mvpPlayer ? (
            <Link
              href={`/players/${data.latestPublished.mvpPlayer.id}`}
              className="group mt-3 flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlayerAvatar
                name={data.latestPublished.mvpPlayer.displayName}
                size="lg"
              />
              <div>
                <p className="font-semibold">
                  {data.latestPublished.mvpPlayer.displayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  GW{data.latestPublished.number} MVP
                </p>
              </div>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              MVP from the latest published gameweek.
            </p>
          )}
        </section>
        <section className="surface relative overflow-hidden rounded-2xl p-5">
          <h2 className="relative flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <CalendarClock className="size-4 text-primary" aria-hidden />
            Next gameweek
          </h2>
          {data.nextMatchday ? (
            <>
              <p className="relative mt-3 font-heading text-3xl font-bold tabular-nums">
                GW{data.nextMatchday.number}
              </p>
              <p className="relative text-sm text-muted-foreground tabular-nums">
                {data.nextMatchday.playedOn}
              </p>
              <Link
                href="/pick"
                className="relative mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                Pick your team →
              </Link>
            </>
          ) : (
            <p className="relative mt-3 text-sm text-muted-foreground">
              No upcoming gameweek scheduled.
            </p>
          )}
        </section>
      </div>

      <div className="animate-rise grid gap-4 sm:grid-cols-2">
        {data.goldenBoot ? (
          <LeaderMini
            icon={<Target className="size-4" aria-hidden />}
            title="Golden Boot"
            name={data.goldenBoot.displayName}
            stat={`${data.goldenBoot.goals} goals`}
            href={`/players/${data.goldenBoot.playerId}`}
          />
        ) : null}
        {data.playmaker ? (
          <LeaderMini
            icon={<Footprints className="size-4" aria-hidden />}
            title="Playmaker"
            name={data.playmaker.displayName}
            stat={`${data.playmaker.assists} assists`}
            href={`/players/${data.playmaker.playerId}`}
          />
        ) : null}
      </div>

      <section aria-labelledby="manager-table-link">
        <SectionHeading
          title="Manager table"
          action={
            <Link href="/table" className="text-sm font-medium text-primary">
              View all →
            </Link>
          }
        />
        <ul className="space-y-2">
          {data.managerStandings.slice(0, 5).map((row) => (
            <li key={row.managerId}>
              <Link
                href={`/managers/${row.managerId}`}
                className="surface flex items-center justify-between rounded-xl px-4 py-3 text-sm"
              >
                <span>
                  <span className="mr-2 tabular-nums text-muted-foreground">
                    #{row.rank}
                  </span>
                  {row.displayName}
                </span>
                <span className="font-semibold tabular-nums text-primary">
                  {row.totalPoints}
                </span>
              </Link>
            </li>
          ))}
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
