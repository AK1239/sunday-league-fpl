import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { GameweekNavigator } from "@/components/manager/gameweek-navigator";
import { GameweekTeam } from "@/components/manager/gameweek-team";
import { PageHeader } from "@/components/fantasy/page-header";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { getDb } from "@/server/db";
import { getGameweekDetails } from "@/server/queries/manager-score-lines";
import {
  getPublicManagerProfile,
  getPublicManagerTeamForGameweek,
} from "@/server/queries/public-competition";

export async function ManagerProfilePanel({
  managerId,
  matchdayId,
}: {
  managerId: string;
  /** When set, show that gameweek; otherwise the latest published. */
  matchdayId?: string;
}) {
  await connection();
  const db = getDb();
  const profile = await getPublicManagerProfile(db, managerId);
  if (!profile) notFound();

  const current = matchdayId
    ? profile.gameweeks.find((g) => g.matchdayId === matchdayId)
    : profile.gameweeks[0];
  if (profile.gameweeks.length > 0 && !current) notFound();

  const [team, details] = current
    ? await Promise.all([
        getPublicManagerTeamForGameweek(db, managerId, current.matchdayId),
        getGameweekDetails(db, managerId, [current.matchdayId]),
      ])
    : [null, null];

  const gameweekNavBasePath = `/managers/${managerId}/gameweeks`;
  const navItems = [...profile.gameweeks]
    .reverse()
    .map((g) => ({
      matchdayId: g.matchdayId,
      number: g.number,
      totalPoints: g.totalPoints,
    }));

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
            description={[
              profile.hasTeamName ? `Managed by ${profile.managerName}` : null,
              profile.standing
                ? `#${profile.standing.rank} · ${profile.standing.totalPoints} pts season total`
                : "No published scores yet",
            ]
              .filter(Boolean)
              .join(" · ")}
            className="min-w-0 flex-1"
          />
        </div>
      </header>

      {profile.gameweeks.length === 0 || !current || !team || !details ? (
        <p className="text-sm text-muted-foreground">No published gameweeks.</p>
      ) : (
        <GameweekNavigator
          items={navItems}
          currentId={current.matchdayId}
          basePath={gameweekNavBasePath}
        >
          <GameweekTeam
            number={current.number}
            playedOn={current.playedOn}
            totalPoints={current.totalPoints}
            rankAfter={current.rankAfter}
            team={team}
            lines={details.lines[current.matchdayId]}
            events={details.events[current.matchdayId]}
            scoreBreakdown={details.scores[current.matchdayId]}
            emptyMessage={
              team.visibility === "hidden"
                ? "Team hidden until deadline."
                : "No team this gameweek."
            }
          />
        </GameweekNavigator>
      )}
    </div>
  );
}
