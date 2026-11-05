import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import {
  getManagerMySeasonId,
  getMyPointsGameweeks,
} from "@/server/queries/manager-my-pages";

export async function MyPointsPanel() {
  await connection();
  const user = await requireUser();
  const seasonId = await getManagerMySeasonId(getDb());
  if (!seasonId) {
    return (
      <EmptyState
        title="No active season"
        description="Gameweek scores appear after results are published."
      />
    );
  }

  const rows = await getMyPointsGameweeks(getDb(), user.userId, seasonId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Season history"
        title="My Points"
        description="Tap a gameweek for the full player breakdown."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No published gameweeks yet"
          description="Your scores will list here once the admin publishes Sunday results."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.matchdayId}>
              <Link
                href={`/my/points/${row.matchdayId}`}
                className="surface flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <p className="font-heading font-semibold tabular-nums">
                    GW{row.number}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.playedOn}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-primary">
                    {row.totalPoints}
                  </p>
                  {row.rankAfter != null ? (
                    <p className="text-xs text-muted-foreground">
                      Rank #{row.rankAfter}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
