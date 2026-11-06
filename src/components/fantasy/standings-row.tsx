import Link from "next/link";
import type { StandingRow } from "@/server/queries/standings";
import { PlayerShirt } from "./player-shirt";
import { RankDelta } from "./rank-delta";

export function StandingsRow({ row }: { row: StandingRow }) {
  return (
    <tr className="group border-b border-border/40 transition-colors last:border-0 hover:bg-primary/5">
      <td className="px-3 py-3 tabular-nums text-muted-foreground">
        {row.rank}
      </td>
      <td className="px-2 py-3">
        <RankDelta delta={row.rankDelta} />
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/players/${row.playerId}`}
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlayerShirt name={row.displayName} kitKey={row.kitKey} size="sm" />
          <span className="font-medium transition-colors group-hover:text-primary">
            {row.displayName}
          </span>
        </Link>
      </td>
      <td className="px-3 py-3 text-right font-heading text-base font-semibold tabular-nums text-primary">
        {row.points}
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
        {row.goals}
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">
        {row.assists}
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
        {row.appearances}
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums xl:table-cell">
        {row.wins}
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums xl:table-cell">
        {row.averagePoints.toFixed(1)}
      </td>
    </tr>
  );
}
