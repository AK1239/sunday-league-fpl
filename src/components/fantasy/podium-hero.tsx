import Link from "next/link";
import type { MockStandingRow } from "@/lib/mock/data";
import { PlayerAvatar } from "./player-avatar";
import { cn } from "@/lib/utils";

const podiumStyles = [
  { order: "order-2", height: "h-28", medal: "text-podium-gold", rank: 1 },
  {
    order: "order-1",
    height: "h-[5.5rem]",
    medal: "text-podium-silver",
    rank: 2,
  },
  { order: "order-3", height: "h-20", medal: "text-podium-bronze", rank: 3 },
] as const;

export function PodiumHero({ topThree }: { topThree: MockStandingRow[] }) {
  const ordered = [topThree[1], topThree[0], topThree[2]].filter(
    Boolean,
  ) as MockStandingRow[];

  return (
    <section
      aria-label="Top three players"
      className="hero-strip relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 px-4 pb-4 pt-6"
    >
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {ordered.map((row, index) => {
          const style = podiumStyles[index]!;
          return (
            <Link
              key={row.player.id}
              href={`/players/${row.player.id}`}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                style.order,
              )}
            >
              <PlayerAvatar
                name={row.player.displayName}
                size={index === 1 ? "lg" : "md"}
              />
              <p className="max-w-full truncate text-center text-sm font-semibold">
                {row.player.displayName}
              </p>
              <p
                className={cn(
                  "font-heading text-3xl font-bold tabular-nums",
                  style.medal,
                )}
              >
                {row.rank}
              </p>
              <div
                className={cn(
                  "mt-1 w-full max-w-[88px] rounded-t-lg bg-muted/80",
                  style.height,
                )}
                aria-hidden
              />
              <p className="font-heading text-lg font-semibold tabular-nums text-primary">
                {row.points}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  pts
                </span>
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
