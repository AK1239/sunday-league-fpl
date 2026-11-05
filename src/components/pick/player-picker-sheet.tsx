"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { FormPips } from "@/components/pick/form-pips";
import type { PickTeamPlayerRow } from "@/server/queries/pick-team-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PickerSort =
  | "expected"
  | "form"
  | "average"
  | "appearances"
  | "name";

export function PlayerPickerSheet({
  open,
  onClose,
  players,
  selectedIds,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  players: PickTeamPlayerRow[];
  selectedIds: Set<string>;
  onSelect: (playerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PickerSort>("expected");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = players.filter((p) => {
      if (selectedIds.has(p.id)) return false;
      if (!q) return true;
      return (
        p.displayName.toLowerCase().includes(q) ||
        (p.nickname?.toLowerCase().includes(q) ?? false)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "expected":
          return b.expectedPoints - a.expectedPoints || a.displayName.localeCompare(b.displayName);
        case "form": {
          const avgA =
            a.form.length === 0
              ? 0
              : a.form.reduce((s, v) => s + v, 0) / a.form.length;
          const avgB =
            b.form.length === 0
              ? 0
              : b.form.reduce((s, v) => s + v, 0) / b.form.length;
          return avgB - avgA || a.displayName.localeCompare(b.displayName);
        }
        case "average": {
          const avgA = a.appearances > 0 ? a.seasonPoints / a.appearances : 0;
          const avgB = b.appearances > 0 ? b.seasonPoints / b.appearances : 0;
          return avgB - avgA || a.displayName.localeCompare(b.displayName);
        }
        case "appearances":
          return b.appearances - a.appearances || a.displayName.localeCompare(b.displayName);
        case "name":
          return a.displayName.localeCompare(b.displayName);
        default:
          return 0;
      }
    });

    return list;
  }, [players, query, selectedIds, sort]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Add player">
      <div className="space-y-3 pb-4">
        <Input
          type="search"
          placeholder="Search players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search players"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["expected", "Expected"],
              ["form", "Form"],
              ["average", "Average"],
              ["appearances", "Apps"],
              ["name", "Name"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sort === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="space-y-2" role="listbox" aria-label="Available players">
          {filtered.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No players match your search.
            </li>
          ) : (
            filtered.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/50 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    onSelect(player.id);
                    onClose();
                    setQuery("");
                  }}
                >
                  <PlayerAvatar
                    name={player.displayName}
                    avatarUrl={player.avatarUrl ?? undefined}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {player.displayName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <FormPips values={player.form.length ? player.form : [0]} />
                      <span className="tabular-nums">
                        Last GW {player.lastGameweekPoints ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-primary">
                      {player.expectedPoints}
                    </p>
                    <p className="text-[10px] text-muted-foreground">xp</p>
                  </div>
                  <Check className="size-4 shrink-0 opacity-0" aria-hidden />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}
