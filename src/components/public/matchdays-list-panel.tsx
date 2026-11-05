import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { getDb } from "@/server/db";
import {
  getActiveSeasonId,
  listPublicMatchdays,
} from "@/server/queries/public-competition";
import { seasons } from "@/server/db/schema";
import { eq } from "drizzle-orm";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export async function MatchdaysListPanel() {
  await connection();
  const db = getDb();
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) {
    return (
      <EmptyState
        title="No active season"
        description="Gameweeks will list here once the season is active."
      />
    );
  }

  const [season] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const list = await listPublicMatchdays(db, seasonId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={season?.name ?? "Season"}
        title="Gameweeks"
        description="Results and manager rankings after publish."
      />

      {list.length === 0 ? (
        <EmptyState
          title="No gameweeks yet"
          description="The admin schedules each Sunday as a gameweek."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((md) => (
            <li key={md.id}>
              <Link
                href={`/matchdays/${md.id}`}
                className="surface flex items-center justify-between gap-4 rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/30"
              >
                <div>
                  <p className="font-heading font-semibold tabular-nums">
                    GW{md.number}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {md.playedOn}
                  </p>
                </div>
                <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium capitalize">
                  {statusLabel(md.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
