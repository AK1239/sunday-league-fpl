"use client";

import { PlayerShirt } from "@/components/fantasy/player-shirt";
import type { TransferHistoryEntry } from "@/server/queries/transfer-page-data";
import { cn } from "@/lib/utils";

export function TransferHistoryTab({
  history,
}: {
  history: TransferHistoryEntry[];
}) {
  if (history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transfer history yet — confirmed changes appear here after each
        gameweek.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {history.map((entry) => (
        <li
          key={entry.matchdayId}
          className="rounded-2xl border border-border/60 bg-card/50 p-4"
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-heading text-lg font-semibold">
              GW{entry.number}
            </h3>
            <p className="text-xs text-muted-foreground tabular-nums">
              {entry.made} made · {entry.freeAvailable} free available
            </p>
          </div>
          <ul className="space-y-2">
            {entry.pairs.map((pair, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <PlayerShirt name={pair.playerOutName} size="sm" />
                  <span className="text-muted-foreground">→</span>
                  <PlayerShirt name={pair.playerInName} size="sm" />
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    pair.penalised
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {pair.penalised ? "−4" : "Free"}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
