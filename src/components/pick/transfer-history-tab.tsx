"use client";

import { ArrowRight } from "lucide-react";
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
        No transfers yet — your confirmed changes appear here.
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
              {entry.open ? (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle font-sans text-[10px] font-semibold tracking-wide text-primary uppercase">
                  Pending
                </span>
              ) : null}
            </h3>
            <p className="text-xs text-muted-foreground tabular-nums">
              {entry.made} made · {entry.freeAvailable} free available
            </p>
          </div>
          <ul className="space-y-2">
            {entry.pairs.map((pair, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <HistorySide
                  label="Out"
                  name={pair.playerOutName}
                  kitKey={pair.playerOutKitKey}
                />
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <HistorySide
                  label="In"
                  name={pair.playerInName}
                  kitKey={pair.playerInKitKey}
                  highlight
                />
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

function HistorySide({
  label,
  name,
  kitKey,
  highlight = false,
}: {
  label: string;
  name: string;
  kitKey: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <PlayerShirt name={name} kitKey={kitKey} size="sm" />
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-semibold tracking-widest uppercase",
            highlight ? "text-primary" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
    </div>
  );
}
