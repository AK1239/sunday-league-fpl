"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type GameweekNavItem = {
  matchdayId: string;
  number: number;
  totalPoints: number;
};

const hrefFor = (id: string) => `/my/points/${id}`;

/**
 * Prev / next arrows + a scrollable gameweek strip. Also wires ←/→ keys and
 * horizontal swipes on the content below it. `items` are oldest → newest.
 */
export function GameweekNavigator({
  items,
  currentId,
  children,
}: {
  items: GameweekNavItem[];
  currentId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const index = items.findIndex((i) => i.matchdayId === currentId);
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentId]);

  // Keyboard: ← older, → newer (ignored while typing or when a dialog is open).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowLeft" && prev) router.push(hrefFor(prev.matchdayId));
      if (e.key === "ArrowRight" && next) router.push(hrefFor(next.matchdayId));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  // Swipe: finger moves right → older GW, left → newer GW.
  const touch = useRef<{ x: number; y: number } | null>(null);

  const arrow =
    "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/60 transition-all outline-none hover:border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring active:scale-90";
  const arrowOff =
    "pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/30 text-muted-foreground/40";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {prev ? (
          <Link
            href={hrefFor(prev.matchdayId)}
            aria-label={`Previous gameweek, GW${prev.number}`}
            className={arrow}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        ) : (
          <span aria-hidden className={arrowOff}>
            <ChevronLeft className="size-5" />
          </span>
        )}

        <nav
          aria-label="Gameweeks"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => {
            const active = item.matchdayId === currentId;
            const latest = i === items.length - 1;
            return (
              <Link
                key={item.matchdayId}
                ref={active ? activeRef : undefined}
                href={hrefFor(item.matchdayId)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-1.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                  active
                    ? "glow-primary border-primary/40 bg-primary text-primary-foreground"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <span className="font-heading text-sm leading-tight font-semibold">
                  GW{item.number}
                </span>
                <span
                  className={cn(
                    "text-xs leading-tight font-semibold tabular-nums",
                    active ? "text-primary-foreground/80" : "text-primary",
                  )}
                >
                  {item.totalPoints}
                </span>
                {latest ? (
                  <span
                    aria-label="Latest"
                    className={cn(
                      "absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-background",
                      active ? "bg-podium-gold" : "bg-primary",
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {next ? (
          <Link
            href={hrefFor(next.matchdayId)}
            aria-label={`Next gameweek, GW${next.number}`}
            className={arrow}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <span aria-hidden className={arrowOff}>
            <ChevronRight className="size-5" />
          </span>
        )}
      </div>

      <div
        key={currentId}
        className="animate-rise touch-pan-y"
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest("dialog")) {
            touch.current = null;
            return;
          }
          const t = e.touches[0]!;
          touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const t = e.changedTouches[0]!;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          if (dx > 0 && prev) router.push(hrefFor(prev.matchdayId));
          if (dx < 0 && next) router.push(hrefFor(next.matchdayId));
        }}
      >
        {children}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <span className="sm:hidden">Swipe to switch gameweeks</span>
          <span className="hidden sm:inline">Use ← → to switch gameweeks</span>
        </p>
      </div>
    </div>
  );
}
