import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/fantasy/page-header";
import { ScoreCard } from "@/components/fantasy/score-card";
import { getDb } from "@/server/db";
import { getPublicMatchDetail } from "@/server/queries/public-players";

export async function MatchDetailPanel({ matchId }: { matchId: string }) {
  await connection();
  const detail = await getPublicMatchDetail(getDb(), matchId);
  if (!detail) notFound();

  return (
    <div className="space-y-8">
      <Link
        href={`/matchdays/${detail.match.matchdayId}`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← GW{detail.match.matchdayNumber}
      </Link>

      <PageHeader
        eyebrow={detail.match.playedOn}
        title={`Match ${detail.match.matchNo}`}
        description="Lineups and goals from published results."
      />

      <ScoreCard
        teamA={{ name: "Side A", score: detail.match.scoreA }}
        teamB={{ name: "Side B", score: detail.match.scoreB }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SideBlock
          title="Side A"
          names={detail.sideA.playerNames}
          gk={detail.sideA.goalkeeperName}
        />
        <SideBlock
          title="Side B"
          names={detail.sideB.playerNames}
          gk={detail.sideB.goalkeeperName}
        />
      </div>

      <section>
        <h2 className="font-heading mb-3 text-lg font-semibold">Goals</h2>
        {detail.goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals recorded.</p>
        ) : (
          <ul className="surface space-y-2 rounded-2xl p-4 text-sm">
            {detail.goals.map((goal, index) => (
              <li key={index}>
                <span className="text-muted-foreground">Side {goal.side}</span>
                {" · "}
                <span className="font-medium">{goal.scorerName}</span>
                {goal.kind === "penalty" ? (
                  <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary uppercase">
                    Pen
                  </span>
                ) : null}
                {goal.kind === "own_goal" ? (
                  <span className="ml-1.5 rounded bg-destructive/15 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-destructive uppercase">
                    Own goal
                  </span>
                ) : null}
                {goal.assistName ? (
                  <span className="text-muted-foreground">
                    {" "}
                    (assist {goal.assistName})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail.incidents.length > 0 ? (
        <section>
          <h2 className="font-heading mb-3 text-lg font-semibold">
            Other incidents
          </h2>
          <ul className="surface space-y-2 rounded-2xl p-4 text-sm">
            {detail.incidents.map((incident, index) => (
              <li key={index}>
                <span className="font-medium">{incident.playerName}</span>
                <span className="text-muted-foreground">
                  {incident.kind === "penalty_saved"
                    ? " saved a penalty"
                    : " handball stopped a goal"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SideBlock({
  title,
  names,
  gk,
}: {
  title: string;
  names: string[];
  gk: string | null;
}) {
  return (
    <div className="surface rounded-2xl p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-2 space-y-1 text-sm">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      {gk ? (
        <p className="mt-2 text-xs text-muted-foreground">GK: {gk}</p>
      ) : null}
    </div>
  );
}
