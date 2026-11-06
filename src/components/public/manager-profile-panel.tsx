import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { GameweekTeam } from "@/components/manager/gameweek-team";
import { PageHeader } from "@/components/fantasy/page-header";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { RankDelta } from "@/components/fantasy/rank-delta";
import { getDb } from "@/server/db";
import { getGameweekDetails } from "@/server/queries/manager-score-lines";
import {
  getPublicManagerProfile,
  getPublicManagerTeamForGameweek,
} from "@/server/queries/public-competition";

export async function ManagerProfilePanel({
  managerId,
}: {
  managerId: string;
}) {
  await connection();
  const db = getDb();
  const profile = await getPublicManagerProfile(db, managerId);
  if (!profile) notFound();

  const teamsWithVisibility = await Promise.all(
    profile.gameweeks.map(async (gw) => ({
      ...gw,
      team: await getPublicManagerTeamForGameweek(db, managerId, gw.matchdayId),
    })),
  );

  const details = await getGameweekDetails(
    db,
    managerId,
    profile.gameweeks.map((g) => g.matchdayId),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-8">
        <div className="space-y-4">
          <Link
            href="/table"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            ← Manager table
          </Link>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            {profile.seasonName}
          </p>
        </div>

        <div className="flex items-start gap-4">
          <PlayerAvatar name={profile.displayName} size="xl" />
          <PageHeader
            title={profile.displayName}
            description={
              profile.standing
                ? `#${profile.standing.rank} · ${profile.standing.totalPoints} pts season total`
                : "No published scores yet"
            }
            className="min-w-0 flex-1"
          />
        </div>
      </header>

      {profile.standing ? (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="surface rounded-full px-3 py-1 tabular-nums">
            Last GW {profile.standing.lastGameweekPoints} pts
          </span>
          <span className="surface rounded-full px-3 py-1 tabular-nums">
            Best GW {profile.standing.bestGameweekPoints} pts
          </span>
          <RankDelta delta={profile.standing.rankDelta} />
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Gameweek scores</h2>
        {profile.gameweeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published gameweeks.
          </p>
        ) : (
          <ul className="space-y-2">
            {profile.gameweeks.map((gw) => (
              <li key={gw.matchdayId}>
                <Link
                  href={`/matchdays/${gw.matchdayId}`}
                  className="surface flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                >
                  <span className="font-medium tabular-nums">
                    GW{gw.number}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {gw.playedOn}
                  </span>
                  <span className="font-semibold tabular-nums text-primary">
                    {gw.totalPoints} pts
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="font-heading text-xl font-semibold">Historical teams</h2>
        <p className="text-sm text-muted-foreground">
          Teams are visible after each gameweek selection deadline.
        </p>
        {teamsWithVisibility.map((entry) => (
          <GameweekTeam
            key={entry.matchdayId}
            number={entry.number}
            playedOn={entry.playedOn}
            totalPoints={entry.totalPoints}
            rankAfter={entry.rankAfter}
            team={entry.team}
            lines={details.lines[entry.matchdayId]}
            events={details.events[entry.matchdayId]}
            scoreBreakdown={details.scores[entry.matchdayId]}
            emptyMessage={
              entry.team.visibility === "hidden"
                ? "Team hidden until deadline."
                : "No team this gameweek."
            }
          />
        ))}
      </section>
    </div>
  );
}
