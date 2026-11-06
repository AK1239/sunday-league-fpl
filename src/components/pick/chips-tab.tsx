"use client";

import type { ChipCardView } from "@/server/queries/chip-page-data";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

function statusLabel(status: ChipCardView["status"]): string {
  switch (status.kind) {
    case "available":
      return "Available";
    case "active":
      return `Active · GW${status.matchdayNumber}`;
    case "used":
      return `Used · GW${status.matchdayNumber}`;
    case "unavailable":
      return status.reason;
  }
}

export function ChipsTab({
  chips,
  matchdayNumber,
  onSelectChip,
}: {
  chips: readonly ChipCardView[];
  matchdayNumber: number;
  onSelectChip: (card: ChipCardView) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        One chip per gameweek · GW{matchdayNumber} deadline applies to chip
        plays too.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {chips.map((card) => {
          const selectable = card.status.kind === "available";
          const active = card.status.kind === "active";
          return (
            <button
              key={card.code}
              type="button"
              disabled={!selectable && !active}
              onClick={() => {
                if (selectable || active) onSelectChip(card);
              }}
              className={cn(
                "flex min-h-[8.5rem] flex-col rounded-2xl border p-3 text-left transition-colors",
                selectable &&
                  "border-lime-500/40 bg-lime-500/10 hover:bg-lime-500/15",
                active &&
                  "border-podium-gold/50 bg-podium-gold/10 shadow-[0_0_24px_-4px] shadow-podium-gold/30",
                card.status.kind === "used" &&
                  "border-border/50 bg-muted/30 opacity-80",
                card.status.kind === "unavailable" &&
                  "border-border/40 bg-muted/20 opacity-70",
              )}
            >
              <Sparkles
                className={cn(
                  "mb-2 size-5",
                  active ? "text-podium-gold" : "text-primary",
                )}
                aria-hidden
              />
              <span className="font-heading text-sm font-semibold leading-tight">
                {card.label}
              </span>
              <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {card.effectLine}
              </span>
              <span
                className={cn(
                  "mt-auto pt-2 text-[0.65rem] font-semibold uppercase tracking-wide",
                  selectable && "text-lime-700 dark:text-lime-400",
                  active && "text-podium-gold",
                )}
              >
                {statusLabel(card.status)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
