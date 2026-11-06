import Link from "next/link";
import type { ManagerStandingRow } from "@/server/queries/manager-standings";
import { PlayerAvatar } from "./player-avatar";
import { RankDelta } from "./rank-delta";

export function ManagerStandingsCard({
  row,
  index = 0,
  showScores = true,
}: {
  row: ManagerStandingRow;
  index?: number;
  /** False before the first gameweek is published: show names only. */
  showScores?: boolean;
}) {
  return (
    <li
      className="animate-rise"
      style={{ "--d": `${Math.min(index, 10) * 45}ms` } as React.CSSProperties}
    >
      <Link
        href={`/managers/${row.managerId}`}
        className="surface surface-hover flex items-center gap-3 rounded-2xl px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
      >
        <span
          className={
            "font-heading w-6 shrink-0 text-xl font-bold tabular-nums " +
            (!showScores
              ? "text-muted-foreground"
              : row.rank === 1
                ? "text-podium-gold"
                : row.rank === 2
                  ? "text-podium-silver"
                  : row.rank === 3
                    ? "text-podium-bronze"
                    : "text-muted-foreground")
          }
        >
          {showScores ? row.rank : "–"}
        </span>
        <PlayerAvatar name={row.displayName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.displayName}</p>
          {showScores ? (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Last GW {row.lastGameweekPoints} · Best {row.bestGameweekPoints}
            </p>
          ) : null}
        </div>
        {showScores ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="font-heading text-lg font-bold tabular-nums text-primary">
              {row.totalPoints}
            </span>
            <RankDelta delta={row.rankDelta} />
          </div>
        ) : null}
      </Link>
    </li>
  );
}
