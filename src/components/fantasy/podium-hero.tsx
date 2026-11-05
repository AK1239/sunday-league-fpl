import { Crown } from "lucide-react";
import Link from "next/link";
import type { MockStandingRow } from "@/lib/mock/data";
import { CountUp } from "./count-up";
import { PlayerAvatar } from "./player-avatar";
import { cn } from "@/lib/utils";

const podiumStyles = [
  {
    height: "h-28",
    medal: "text-podium-gold",
    block: "from-podium-gold/35 to-podium-gold/5 border-podium-gold/40",
    delay: 300,
  },
  {
    height: "h-[5.5rem]",
    medal: "text-podium-silver",
    block: "from-podium-silver/30 to-podium-silver/5 border-podium-silver/35",
    delay: 150,
  },
  {
    height: "h-20",
    medal: "text-podium-bronze",
    block: "from-podium-bronze/30 to-podium-bronze/5 border-podium-bronze/35",
    delay: 450,
  },
] as const;

export function PodiumHero({ topThree }: { topThree: MockStandingRow[] }) {
  // Visual order: 2nd, 1st, 3rd
  const ordered = [topThree[1], topThree[0], topThree[2]].filter(
    Boolean,
  ) as MockStandingRow[];

  return (
    <section
      aria-label="Top three players"
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 px-4 pt-8 pb-0 backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="animate-float absolute top-0 left-1/2 size-80 -translate-x-1/2 -translate-y-1/3 rounded-full bg-podium-gold/20 blur-[90px]"
      />
      <div
        aria-hidden
        className="hero-strip pointer-events-none absolute inset-0"
      />
      <div className="relative flex items-end justify-center gap-3 sm:gap-8">
        {ordered.map((row) => {
          const style =
            podiumStyles[row.rank === 1 ? 0 : row.rank === 2 ? 1 : 2];
          const first = row.rank === 1;
          return (
            <Link
              key={row.player.id}
              href={`/players/${row.player.id}`}
              className="group flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className="animate-rise flex flex-col items-center gap-2"
                style={
                  { "--d": `${style.delay + 200}ms` } as React.CSSProperties
                }
              >
                {first ? (
                  <Crown
                    className="animate-pop size-6 text-podium-gold drop-shadow-[0_0_8px_var(--podium-gold)]"
                    aria-hidden
                  />
                ) : null}
                <div
                  className={cn(
                    "rounded-full transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105",
                    first && "animate-pulse-ring",
                  )}
                >
                  <PlayerAvatar
                    name={row.player.displayName}
                    size={first ? "xl" : "lg"}
                  />
                </div>
                <p className="max-w-full truncate text-center text-sm font-semibold">
                  {row.player.displayName}
                </p>
                <p className="font-heading text-lg font-semibold tabular-nums text-primary">
                  <CountUp value={row.points} />
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    pts
                  </span>
                </p>
              </div>
              <div
                className={cn(
                  "animate-grow-up flex w-full max-w-28 items-start justify-center rounded-t-xl border border-b-0 bg-gradient-to-b pt-2",
                  style.block,
                  style.height,
                )}
                style={{ "--d": `${style.delay}ms` } as React.CSSProperties}
                aria-hidden
              >
                <span
                  className={cn("font-heading text-4xl font-bold", style.medal)}
                >
                  {row.rank}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
