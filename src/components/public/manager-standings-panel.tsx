import { connection } from "next/server";
import { ManagerStandingsCard } from "@/components/fantasy/manager-standings-card";
import { ManagerStandingsRow } from "@/components/fantasy/manager-standings-row";
import { EmptyState } from "@/components/fantasy/empty-state";
import { getDb } from "@/server/db";
import { getActiveSeasonId } from "@/server/queries/public-competition";
import { getManagerStandings } from "@/server/queries/manager-standings";
import { seasons } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function ManagerStandingsPanel() {
  await connection();
  const db = getDb();
  const seasonId = await getActiveSeasonId(db);
  if (!seasonId) {
    return (
      <EmptyState
        title="No active season"
        description="The manager table will appear when a season is active."
      />
    );
  }

  const [season] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const rows = await getManagerStandings(db, seasonId);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No manager scores yet"
        description="Publish a gameweek with manager teams to populate the table."
      />
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{season?.name}</p>

      <ul className="space-y-2 md:hidden" aria-label="Manager leaderboard">
        {rows.map((row, i) => (
          <ManagerStandingsCard key={row.managerId} row={row} index={i} />
        ))}
      </ul>

      <div className="surface hidden overflow-x-auto rounded-2xl md:block">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Manager season standings</caption>
          <thead className="border-b border-border/50 bg-muted/30 text-left text-xs tracking-widest text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-3 py-3">
                #
              </th>
              <th scope="col" className="px-2 py-3">
                Δ
              </th>
              <th scope="col" className="px-3 py-3">
                Manager
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Pts
              </th>
              <th scope="col" className="hidden px-3 py-3 text-right sm:table-cell">
                Last GW
              </th>
              <th scope="col" className="hidden px-3 py-3 text-right md:table-cell">
                Best GW
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ManagerStandingsRow key={row.managerId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
