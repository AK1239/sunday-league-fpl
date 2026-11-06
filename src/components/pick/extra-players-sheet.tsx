"use client";

import { Armchair, Check, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { FormPips } from "@/components/pick/form-pips";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { BENCH_BOOST_EXTRA_COUNT } from "@/server/chips/bench-boost-extras";
import { cn } from "@/lib/utils";
import type { PickTeamPlayerRow } from "@/server/queries/pick-team-data";

/**
 * Bench Boost: choose the extra players whose points also count this gameweek.
 * Opens straight away when the chip is tapped.
 */
export function ExtraPlayersSheet({
  open,
  onClose,
  players,
  selectedIds,
  onChange,
  onRemoveChip,
}: {
  open: boolean;
  onClose: () => void;
  /** Candidates: everyone not already in the five. */
  players: PickTeamPlayerRow[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  /** Drops Bench Boost entirely. */
  onRemoveChip?: () => void;
}) {
  const [query, setQuery] = useState("");
  const full = selectedIds.length >= BENCH_BOOST_EXTRA_COUNT;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter(
        (p) =>
          !q ||
          p.displayName.toLowerCase().includes(q) ||
          (p.nickname?.toLowerCase().includes(q) ?? false),
      )
      .sort(
        (a, b) =>
          b.expectedPoints - a.expectedPoints ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [players, query]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (!full) {
      onChange([...selectedIds, id]);
    }
  }

  function close() {
    setQuery("");
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Bench Boost"
      description={`Choose ${BENCH_BOOST_EXTRA_COUNT} extra players`}
      leading={
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
        >
          <Armchair className="size-5" />
        </span>
      }
      toolbar={
        <>
          <p className="text-sm text-muted-foreground">
            Their points count on top of your five. They only score if they
            attend.
          </p>
          <ul
            className="grid grid-cols-2 gap-2"
            aria-label="Chosen extra players"
          >
            {Array.from({ length: BENCH_BOOST_EXTRA_COUNT }, (_, i) => {
              const id = selectedIds[i];
              const player = id ? byId.get(id) : undefined;
              return (
                <li key={i}>
                  {player ? (
                    <button
                      type="button"
                      onClick={() => toggle(player.id)}
                      aria-label={`Remove ${player.displayName}`}
                      className="flex w-full items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <PlayerShirt
                        name={player.displayName}
                        kitKey={player.kitKey}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {player.displayName}
                      </span>
                      <X className="size-4 text-muted-foreground" aria-hidden />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted/50">
                        <Plus className="size-4" aria-hidden />
                      </span>
                      Extra {i + 1}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search players…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search players"
              autoComplete="off"
              className="pl-10 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
        </>
      }
    >
      <ul className="space-y-2 pb-24" aria-label="Available players">
        {list.length === 0 ? (
          <li className="py-12 text-center text-sm text-muted-foreground">
            No players match your search.
          </li>
        ) : (
          list.map((player) => {
            const selected = selectedIds.includes(player.id);
            const blocked = full && !selected;
            return (
              <li key={player.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={blocked}
                  onClick={() => toggle(player.id)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                    selected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/50 bg-card/50 hover:border-primary/40",
                    blocked && "opacity-40",
                  )}
                >
                  <PlayerShirt
                    name={player.displayName}
                    kitKey={player.kitKey}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {player.displayName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <FormPips
                        values={player.form.length ? player.form : [0]}
                      />
                      <span className="tabular-nums">
                        Last GW {player.lastGameweekPoints ?? "—"}
                      </span>
                    </div>
                  </div>
                  {selected ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" aria-hidden />
                    </span>
                  ) : (
                    <div className="rounded-xl bg-primary/10 px-2.5 py-1 text-center">
                      <p className="font-heading text-lg leading-none font-bold text-primary tabular-nums">
                        {player.expectedPoints}
                      </p>
                      <p className="text-[10px] text-muted-foreground">xp</p>
                    </div>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border/50 bg-background/95 px-4 pt-3 pb-1 backdrop-blur sm:-mx-5 sm:px-5">
        <Button
          type="button"
          className="w-full"
          disabled={!full}
          onClick={close}
        >
          {full
            ? "Done"
            : `Pick ${BENCH_BOOST_EXTRA_COUNT - selectedIds.length} more`}
        </Button>
        {onRemoveChip ? (
          <button
            type="button"
            onClick={() => {
              onRemoveChip();
              close();
            }}
            className="w-full py-1 text-center text-xs font-medium text-muted-foreground outline-none hover:text-destructive focus-visible:underline"
          >
            Remove Bench Boost
          </button>
        ) : null}
      </div>
    </Drawer>
  );
}
