"use client";

import { useMemo, useState } from "react";
import { Search, TriangleAlert, X } from "lucide-react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { Drawer } from "@/components/ui/drawer";
import { FormPips } from "@/components/pick/form-pips";
import type { PickTeamPlayerRow } from "@/server/queries/pick-team-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PickerSort =
  "expected" | "form" | "average" | "appearances" | "name";

const SORTS = [
  ["expected", "Expected"],
  ["form", "Form"],
  ["average", "Average"],
  ["appearances", "Apps"],
  ["name", "Name"],
] as const;

export function PlayerPickerSheet({
  open,
  onClose,
  players,
  selectedIds,
  onSelect,
  costBanner,
  replacingName,
  replacingKitKey,
}: {
  open: boolean;
  onClose: () => void;
  players: PickTeamPlayerRow[];
  selectedIds: Set<string>;
  onSelect: (playerId: string) => void;
  /** Shown when the next pick would be an extra transfer. */
  costBanner?: string | null;
  /** Name of the player being transferred out, shown as context. */
  replacingName?: string | null;
  replacingKitKey?: string | null;
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
          return (
            b.expectedPoints - a.expectedPoints ||
            a.displayName.localeCompare(b.displayName)
          );
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
          return (
            b.appearances - a.appearances ||
            a.displayName.localeCompare(b.displayName)
          );
        case "name":
          return a.displayName.localeCompare(b.displayName);
        default:
          return 0;
      }
    });

    return list;
  }, [players, query, selectedIds, sort]);

  function close() {
    setQuery("");
    onClose();
  }

  // Keep the last "replacing" name while the drawer slides out, so the title
  // doesn't flip to "Add player" mid-animation.
  const [keptName, setKeptName] = useState<string | null>(null);
  if (replacingName && replacingName !== keptName) setKeptName(replacingName);
  const replacing = replacingName ?? (open ? null : keptName);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={replacing ? "Choose replacement" : "Add player"}
      description={replacing ? `Replacing ${replacing}` : undefined}
      leading={
        replacing ? (
          <PlayerShirt
            name={replacing}
            kitKey={replacingKitKey}
            size="md"
            className="opacity-60 grayscale"
          />
        ) : undefined
      }
      toolbar={
        <>
          {costBanner ? (
            <p
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-500"
              role="status"
            >
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              {costBanner}
            </p>
          ) : null}
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
              enterKeyHint="search"
              className="pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <div
            data-no-swipe
            role="group"
            aria-label="Sort players"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden"
          >
            {SORTS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sort === value}
                onClick={() => setSort(value)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                  sort === value
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      }
    >
      <p
        className="pb-2 text-xs font-medium tracking-widest text-muted-foreground uppercase"
        aria-live="polite"
      >
        {filtered.length} available
      </p>
      <ul className="space-y-2" role="listbox" aria-label="Available players">
        {filtered.length === 0 ? (
          <li className="py-12 text-center text-sm text-muted-foreground">
            No players match your search.
          </li>
        ) : (
          filtered.map((player, i) => (
            <li
              key={player.id}
              className="animate-rise"
              style={
                { "--d": `${Math.min(i, 8) * 30}ms` } as React.CSSProperties
              }
            >
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/50 px-3 py-2.5 text-left text-foreground transition-all outline-none hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                onClick={() => {
                  onSelect(player.id);
                  close();
                }}
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
                    <FormPips values={player.form.length ? player.form : [0]} />
                    <span className="tabular-nums">
                      Last GW {player.lastGameweekPoints ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-primary/10 px-2.5 py-1 text-center">
                  <p className="font-heading text-lg leading-none font-bold text-primary tabular-nums">
                    {player.expectedPoints}
                  </p>
                  <p className="text-[10px] text-muted-foreground">xp</p>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </Drawer>
  );
}
