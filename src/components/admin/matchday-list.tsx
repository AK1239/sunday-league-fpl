"use client";

import { useMemo, useState } from "react";
import {
  MatchdayCard,
  type MatchdayCardData,
} from "@/components/admin/matchday-card";
import { cn } from "@/lib/utils";

type Filter = "all" | "open" | "published" | "cancelled";

const PAGE_SIZE = 8;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "published", label: "Published" },
  { key: "cancelled", label: "Cancelled" },
];

function matches(filter: Filter, status: string) {
  switch (filter) {
    case "open":
      return status === "scheduled" || status === "draft";
    case "published":
      return status === "published";
    case "cancelled":
      return status === "cancelled";
    default:
      return true;
  }
}

/**
 * Admin gameweek list that stays readable as the season grows: the next open
 * gameweek is a full card; everything else is a compact one-line row, with a
 * status filter and "show more".
 */
export function MatchdayList({
  items,
  timezone,
}: {
  /** Newest first. */
  items: MatchdayCardData[];
  timezone: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // The gameweek being worked on: the earliest one that is still open.
  const nextUp = useMemo(
    () =>
      [...items]
        .filter((m) => m.status === "scheduled" || m.status === "draft")
        .sort((a, b) => a.number - b.number)[0] ?? null,
    [items],
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: items.length,
      open: 0,
      published: 0,
      cancelled: 0,
    };
    for (const m of items) {
      if (matches("open", m.status)) c.open++;
      else if (m.status === "published") c.published++;
      else if (m.status === "cancelled") c.cancelled++;
    }
    return c;
  }, [items]);

  const rest = useMemo(
    () => items.filter((m) => m.id !== nextUp?.id && matches(filter, m.status)),
    [items, nextUp, filter],
  );
  const shown = rest.slice(0, visible);
  const showFilters = items.length > 4;

  return (
    <div className="space-y-6">
      {nextUp && (filter === "all" || matches(filter, nextUp.status)) ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Next up
          </p>
          <ul>
            <MatchdayCard index={0} timezone={timezone} matchday={nextUp} />
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {nextUp ? "All gameweeks" : "Gameweeks"}
          </p>
          {showFilters ? (
            <div
              role="group"
              aria-label="Filter gameweeks"
              className="inline-flex gap-1 rounded-full border border-border/60 bg-card/50 p-1"
            >
              {FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0).map(
                (f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={filter === f.key}
                    onClick={() => {
                      setFilter(f.key);
                      setVisible(PAGE_SIZE);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      filter === f.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f.label}
                    <span className="ml-1.5 text-xs tabular-nums opacity-70">
                      {counts[f.key]}
                    </span>
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>

        {shown.length === 0 ? (
          <p className="surface rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
            No gameweeks match this filter.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {shown.map((md, i) => (
              <MatchdayCard
                key={md.id}
                compact
                index={i}
                timezone={timezone}
                matchday={md}
              />
            ))}
          </ul>
        )}

        {rest.length > visible ? (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full rounded-2xl border border-dashed border-border/70 py-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Show {Math.min(PAGE_SIZE, rest.length - visible)} more
            <span className="ml-1.5 text-xs tabular-nums opacity-70">
              ({rest.length - visible} remaining)
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
