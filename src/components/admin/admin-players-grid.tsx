"use client";

import { Check, Pencil, Power, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { Input } from "@/components/ui/input";
import { toastActionResult } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import {
  deactivatePlayerAction,
  reactivatePlayerAction,
  updatePlayerAction,
} from "@/server/actions/players";
import { KIT_SELECT_OPTIONS } from "@/lib/kits";

export type AdminPlayer = {
  id: string;
  displayName: string;
  nickname: string | null;
  kitKey: string | null;
  active: boolean;
};

type Filter = "all" | "active" | "inactive";

export function AdminPlayersGrid({ players }: { players: AdminPlayer[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const activeCount = players.filter((p) => p.active).length;
  const counts: Record<Filter, number> = {
    all: players.length,
    active: activeCount,
    inactive: players.length - activeCount,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (filter === "active" && !p.active) return false;
      if (filter === "inactive" && p.active) return false;
      if (!q) return true;
      return (
        p.displayName.toLowerCase().includes(q) ||
        (p.nickname ?? "").toLowerCase().includes(q)
      );
    });
  }, [players, query, filter]);

  return (
    <section aria-labelledby="player-list" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="player-list"
          className="font-heading flex items-center gap-2.5 text-xl font-semibold"
        >
          <span aria-hidden className="h-5 w-1 rounded-full bg-primary" />
          Squad
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {activeCount} active · {players.length} total
          </span>
        </h2>
        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
            aria-label="Search players"
            className="h-10 pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="Filter players">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
              filter === f
                ? "glow-primary border-primary/40 bg-primary text-primary-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {f}
            <span className="ml-1.5 text-xs tabular-nums opacity-70">
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="surface rounded-2xl px-4 py-10 text-center text-sm text-muted-foreground">
          No players match.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((player, i) => (
            <PlayerCard key={player.id} player={player} index={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlayerCard({ player, index }: { player: AdminPlayer; index: number }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const iconBtn =
    "relative z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <li
      className="animate-rise"
      style={{ "--d": `${Math.min(index, 12) * 35}ms` } as React.CSSProperties}
    >
      <div
        className={cn(
          "surface surface-hover group relative flex items-center gap-4 rounded-2xl p-4",
          !player.active && "opacity-60 hover:opacity-100",
        )}
      >
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-primary/10 to-transparent">
          <PlayerShirt
            name={player.displayName}
            kitKey={player.kitKey}
            size="md"
          />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="relative z-10 flex flex-col gap-2"
              action={(formData) => {
                startTransition(async () => {
                  const result = await updatePlayerAction(player.id, formData);
                  toastActionResult(result, "Player updated");
                  if (result.ok) setEditing(false);
                });
              }}
            >
              <div className="flex items-center gap-1.5">
                <Input
                  name="displayName"
                  defaultValue={player.displayName}
                  aria-label={`Display name for ${player.displayName}`}
                  className="h-9 min-w-0 flex-1"
                  required
                  autoFocus
                  disabled={pending}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
                <button
                  type="submit"
                  aria-label="Save name"
                  disabled={pending}
                  className={cn(iconBtn, "bg-primary/15 text-primary")}
                >
                  <Check className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setEditing(false)}
                  className={iconBtn}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Shirt</span>
                <select
                  name="kitKey"
                  defaultValue={player.kitKey ?? "neutral"}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                  disabled={pending}
                >
                  {KIT_SELECT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          ) : (
            <>
              <Link
                href={`/players/${player.id}`}
                className="block truncate font-heading text-xl font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {player.displayName}
              </Link>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                    player.active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      player.active ? "bg-primary" : "bg-muted-foreground",
                    )}
                  />
                  {player.active ? "Active" : "Inactive"}
                </span>
                {player.nickname ? (
                  <span className="truncate">“{player.nickname}”</span>
                ) : null}
              </div>
            </>
          )}
        </div>

        {!editing ? (
          <div className="flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              className={iconBtn}
              aria-label={`Rename ${player.displayName}`}
              title="Rename"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(
                iconBtn,
                player.active ? "hover:text-destructive" : "hover:text-primary",
              )}
              disabled={pending}
              aria-label={
                player.active
                  ? `Deactivate ${player.displayName}`
                  : `Reactivate ${player.displayName}`
              }
              title={player.active ? "Deactivate" : "Reactivate"}
              onClick={() =>
                startTransition(async () => {
                  const result = player.active
                    ? await deactivatePlayerAction(player.id)
                    : await reactivatePlayerAction(player.id);
                  toastActionResult(
                    result,
                    player.active ? "Player deactivated" : "Player reactivated",
                  );
                })
              }
            >
              {player.active ? (
                <Power className="size-4" aria-hidden />
              ) : (
                <RotateCcw className="size-4" aria-hidden />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
