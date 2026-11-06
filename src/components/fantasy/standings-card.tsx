import Link from "next/link";
import type { StandingRow } from "@/server/queries/standings";
import { PlayerShirt } from "./player-shirt";
import { RankDelta } from "./rank-delta";

export function StandingsCard({
  row,
  index = 0,
}: {
  row: StandingRow;
  index?: number;
}) {
  return (
    <li
      className="animate-rise"
      style={{ "--d": `${Math.min(index, 10) * 45}ms` } as React.CSSProperties}
    >
      <Link
        href={`/players/${row.playerId}`}
        className="surface surface-hover flex items-center gap-3 rounded-2xl px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
      >
        <span
          className={
            "font-heading w-6 shrink-0 text-xl font-bold tabular-nums " +
            (row.rank === 1
              ? "text-podium-gold"
              : row.rank === 2
                ? "text-podium-silver"
                : row.rank === 3
                  ? "text-podium-bronze"
                  : "text-muted-foreground")
          }
        >
          {row.rank}
        </span>
        <PlayerShirt name={row.displayName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.displayName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {row.goals}G · {row.assists}A · {row.appearances} apps
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-heading text-lg font-bold tabular-nums text-primary">
            {row.points}
          </span>
          <RankDelta delta={row.rankDelta} />
        </div>
      </Link>
    </li>
  );
}
