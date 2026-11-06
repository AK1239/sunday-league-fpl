"use client";

import { CHIP_REGISTRY, type ChipCode } from "@/server/chips/registry";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const BANNER_COPY: Partial<Record<ChipCode, string>> = {
  wildcard:
    "Wildcard active — changes are free and permanent for next gameweek.",
  free_hit: "Free Hit — your original team returns after this gameweek.",
  bench_boost: "Bench Boost — your 2 extra players score too.",
  triple_captain: "Triple Captain — captain scores ×3 if they attend.",
};

export function ActiveChipBanner({
  chipCode,
  onCancel,
  cancelling,
  readOnly,
}: {
  chipCode: ChipCode;
  onCancel?: () => void;
  cancelling?: boolean;
  readOnly?: boolean;
}) {
  const label = CHIP_REGISTRY[chipCode].label;
  const detail = BANNER_COPY[chipCode];

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-podium-gold/40 bg-podium-gold/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{label} active</p>
        {detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      {!readOnly && onCancel ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1"
          disabled={cancelling}
          onClick={onCancel}
        >
          <X className="size-3.5" aria-hidden />
          Cancel chip
        </Button>
      ) : null}
    </div>
  );
}
