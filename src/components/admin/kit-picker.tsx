"use client";

import { Check } from "lucide-react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { KIT_SELECT_OPTIONS, type KitKey } from "@/lib/kits";
import { cn } from "@/lib/utils";

/** Visual shirt selector. Renders a hidden input so it works inside native forms. */
export function KitPicker({
  name = "kitKey",
  value,
  onChange,
  playerName,
  disabled,
}: {
  name?: string;
  value: KitKey;
  onChange: (key: KitKey) => void;
  playerName: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label="Shirt"
        className="grid grid-cols-4 gap-2"
      >
        {KIT_SELECT_OPTIONS.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border px-1 pt-2 pb-1.5 text-[11px] leading-tight font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-50",
                selected
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/60 bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <PlayerShirt name={playerName} kitKey={o.value} size="sm" />
              <span className="w-full truncate text-center">{o.label}</span>
              {selected ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
