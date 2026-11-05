import { StandingsCard } from "@/components/fantasy/standings-card";
import { StandingsRow } from "@/components/fantasy/standings-row";
import { StandingsSortChips } from "@/components/fantasy/standings-sort-chips";
import { getMockStandings } from "@/lib/mock/data";
import { parseStandingSort } from "@/lib/mock/sort";

export async function StandingsView({
  searchParams,
}: {
  searchParams: PageProps<"/table">["searchParams"];
}) {
  const params = await searchParams;
  const sort = parseStandingSort(
    typeof params.sort === "string" ? params.sort : undefined,
  );
  const rows = getMockStandings(sort);

  return (
    <>
      <StandingsSortChips />

      <ul className="space-y-2 md:hidden" aria-label="League standings">
        {rows.map((row, i) => (
          <StandingsCard key={row.player.id} row={row} index={i} />
        ))}
      </ul>

      <div className="surface animate-rise hidden overflow-x-auto rounded-2xl md:block">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">
            League standings sorted by {sort}
          </caption>
          <thead className="border-b border-border/50 bg-muted/30 text-left text-xs tracking-widest text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-3 py-3">
                #
              </th>
              <th scope="col" className="px-2 py-3">
                Δ
              </th>
              <th scope="col" className="px-3 py-3">
                Player
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Pts
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right sm:table-cell"
              >
                G
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right md:table-cell"
              >
                A
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right lg:table-cell"
              >
                Apps
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right xl:table-cell"
              >
                W
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right xl:table-cell"
              >
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <StandingsRow key={row.player.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
