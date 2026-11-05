import Link from "next/link";
import type { MockStandingRow } from "@/lib/mock/data";
import { PlayerAvatar } from "./player-avatar";
import { RankDelta } from "./rank-delta";

export function StandingsRow({ row }: { row: MockStandingRow }) {
  return (
    <tr className="border-b border-border/50 transition-colors hover:bg-muted/30">
      <td className="px-3 py-3 tabular-nums text-muted-foreground">
        {row.rank}
      </td>
      <td className="px-2 py-3">
        <RankDelta delta={row.rankDelta} />
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/players/${row.player.id}`}
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlayerAvatar name={row.player.displayName} size="sm" />
          <span className="font-medium">{row.player.displayName}</span>
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
