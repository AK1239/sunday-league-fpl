"use client";

import {
  Armchair,
  Crown,
  Lock,
  Shuffle,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChipCode } from "@/server/chips/registry";
import type { ChipCardView } from "@/server/queries/chip-page-data";

const CHIP_ICON: Record<ChipCode, LucideIcon> = {
  triple_captain: Crown,
  wildcard: Shuffle,
  free_hit: Zap,
  bench_boost: Armchair,
};

function shortStatus(status: ChipCardView["status"]): string {
  switch (status.kind) {
    case "available":
      return "Play";
    case "active":
      return "Active";
    case "used":
      return `Used GW${status.matchdayNumber}`;
    case "unavailable":
      return "Locked";
  }
}

function fullStatus(card: ChipCardView): string {
  const { status } = card;
  switch (status.kind) {
    case "available":
      return "Available";
    case "active":
      return `Active for GW${status.matchdayNumber}`;
    case "used":
      return `Used in GW${status.matchdayNumber}`;
    case "unavailable":
      return status.reason;
  }
}

/**
 * FPL-style chip strip that lives right above the pitch.
 * Tap an available or active chip to open its detail sheet.
 */
export function ChipRail({
  chips,
  onSelectChip,
  className,
}: {
  chips: readonly ChipCardView[];
  onSelectChip: (card: ChipCardView) => void;
  className?: string;
}) {
  return (
    <section aria-label="Chips" className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Chips
        </h2>
        <p className="text-[0.7rem] text-muted-foreground">One per gameweek</p>
      </div>
      <ul className="grid grid-cols-4 gap-2">
        {chips.map((card) => {
          const Icon = CHIP_ICON[card.code] ?? Sparkles;
          const kind = card.status.kind;
          const interactive = kind === "available" || kind === "active";
          return (
            <li key={card.code}>
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onSelectChip(card)}
                title={`${card.label} — ${fullStatus(card)}`}
                aria-label={`${card.label}, ${fullStatus(card)}`}
                className={cn(
                  "relative flex h-full w-full flex-col items-center gap-1 rounded-2xl border px-1.5 pt-3 pb-2 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                  kind === "available" &&
                    "border-primary/35 bg-primary/10 hover:bg-primary/15 active:scale-95",
                  kind === "active" &&
                    "border-podium-gold/60 bg-podium-gold/15 shadow-[0_0_22px_-6px] shadow-podium-gold/50 active:scale-95",
                  kind === "used" && "border-border/50 bg-muted/30 opacity-70",
                  kind === "unavailable" &&
                    "border-border/40 bg-muted/20 opacity-55",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    kind === "active"
                      ? "bg-podium-gold/25 text-podium-gold"
                      : kind === "available"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {kind === "unavailable" ? (
                    <Lock className="size-4" />
                  ) : (
                    <Icon className="size-[1.15rem]" />
                  )}
                </span>
                <span className="font-heading text-[0.8rem] leading-tight font-semibold">
                  {card.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase",
                    kind === "available" &&
                      "bg-primary text-primary-foreground",
                    kind === "active" && "bg-podium-gold text-black",
                    (kind === "used" || kind === "unavailable") &&
                      "text-muted-foreground",
                  )}
                >
                  {shortStatus(card.status)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
