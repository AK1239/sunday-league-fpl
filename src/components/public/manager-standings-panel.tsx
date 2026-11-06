import { connection } from "next/server";
import { ManagerStandingsCard } from "@/components/fantasy/manager-standings-card";
import { ManagerStandingsRow } from "@/components/fantasy/manager-standings-row";
import { EmptyState } from "@/components/fantasy/empty-state";
import { getDb } from "@/server/db";
import { getActiveSeasonId } from "@/server/queries/public-competition";
import { StandingsScopeChips } from "@/components/fantasy/standings-scope-chips";
import {
  getAllTimeManagerStandings,
  getManagerStandings,
} from "@/server/queries/manager-standings";
import { seasons } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function ManagerStandingsPanel({
  searchParams,
}: {
  searchParams: PageProps<"/table">["searchParams"];
}) {
  await connection();
  const db = getDb();
  const params = await searchParams;
  const allTime = params.scope === "all-time";

  const seasonId = allTime ? null : await getActiveSeasonId(db);
  if (!allTime && !seasonId) {
    return (
      <>
        <StandingsScopeChips basePath="/table" />
        <EmptyState
          title="No active season"
          description="The manager table will appear when a season is active."
        />
      </>
    );
  }

  const [season] =
    seasonId != null
      ? await db
          .select({ name: seasons.name })
          .from(seasons)
          .where(eq(seasons.id, seasonId))
          .limit(1)
      : [];

  const rows = allTime
    ? await getAllTimeManagerStandings(db, { includeUnscored: true })
    : await getManagerStandings(db, seasonId!, { includeUnscored: true });
  const noPointsYet = rows.every((row) => row.totalPoints === 0);

  if (rows.length === 0) {
    return (
      <>
        <StandingsScopeChips basePath="/table" />
        <EmptyState
          title="No managers yet"
          description="Managers appear here as soon as they join the league."
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <StandingsScopeChips basePath="/table" />
        <p className="text-sm text-muted-foreground">
          {allTime ? "All seasons combined" : season?.name}
        </p>
      </div>

      {noPointsYet ? (
        <p className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {rows.length} manager{rows.length === 1 ? " has" : "s have"} joined.
          Points and rankings start once the first gameweek is published.
        </p>
      ) : null}

      <ul className="space-y-2 md:hidden" aria-label="Manager leaderboard">
        {rows.map((row, i) => (
          <ManagerStandingsCard
            key={row.managerId}
            row={row}
            index={i}
            showScores={!noPointsYet}
          />
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
              {noPointsYet ? null : (
                <th scope="col" className="px-2 py-3">
                  Δ
                </th>
              )}
              <th scope="col" className="px-3 py-3">
                Manager
              </th>
              {noPointsYet ? null : (
                <>
                  <th scope="col" className="px-3 py-3 text-right">
                    Pts
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-right sm:table-cell"
                  >
                    Last GW
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-right md:table-cell"
                  >
                    Best GW
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ManagerStandingsRow
                key={row.managerId}
                row={row}
                showScores={!noPointsYet}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
