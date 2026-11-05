import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/fantasy/page-header";
import { ScoreCard } from "@/components/fantasy/score-card";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { getDb } from "@/server/db";
import { getPublicMatchdayDetail } from "@/server/queries/public-competition";

export async function MatchdayDetailPanel({
  matchdayId,
}: {
  matchdayId: string;
}) {
  await connection();
  const detail = await getPublicMatchdayDetail(getDb(), matchdayId);
  if (!detail) notFound();

  const { matchday, matches, managerRanking } = detail;
  const published = matchday.status === "published";

  return (
    <div className="space-y-8">
      <Link
        href="/matchdays"
        className="text-sm font-medium text-primary hover:underline"
      >
        ← All gameweeks
      </Link>

      <PageHeader
        eyebrow={published ? "Results" : matchday.status}
        title={`Gameweek ${matchday.number}`}
        description={matchday.playedOn}
      />

      <section>
        <SectionHeading title="Matches" />
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches yet.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matchdays/${matchdayId}/matches/${match.id}`}
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
        )}
      </section>

      {published ? (
        <section>
          <SectionHeading title="Manager ranking" />
          {managerRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No manager scores for this gameweek.
            </p>
          ) : (
            <ol className="space-y-2">
              {managerRanking.map((row) => (
                <li key={row.managerId}>
                  <Link
                    href={`/managers/${row.managerId}`}
                    className="surface flex items-center gap-3 rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/30"
                  >
                    <span className="w-6 font-heading text-lg font-bold tabular-nums text-muted-foreground">
                      {row.rank}
                    </span>
                    <PlayerAvatar name={row.displayName} size="sm" />
                    <span className="flex-1 font-medium">{row.displayName}</span>
                    <span className="font-heading text-lg font-bold tabular-nums text-primary">
                      {row.totalPoints}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Manager rankings appear after this gameweek is published.
        </p>
      )}
    </div>
  );
}
