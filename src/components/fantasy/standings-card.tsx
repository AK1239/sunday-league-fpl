import Link from "next/link";
import type { MockStandingRow } from "@/lib/mock/data";
import { PlayerAvatar } from "./player-avatar";
import { RankDelta } from "./rank-delta";

export function StandingsCard({ row }: { row: MockStandingRow }) {
  return (
    <li>
      <Link
        href={`/players/${row.player.id}`}
        className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/90 px-3 py-3 outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-heading w-6 shrink-0 text-lg font-bold tabular-nums text-muted-foreground">
          {row.rank}
        </span>
        <PlayerAvatar name={row.player.displayName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.player.displayName}</p>
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
