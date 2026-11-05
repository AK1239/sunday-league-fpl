import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankDelta({
  delta,
  className,
}: {
  delta: number;
  className?: string;
}) {
  if (delta === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs text-muted-foreground",
          className,
        )}
        aria-label="No change in rank"
      >
        <Minus className="size-3.5" aria-hidden />
        <span className="sr-only">No change</span>
      </span>
    );
  }

  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up
          ? "rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-emerald-400"
          : "rounded-full bg-rose-400/10 px-1.5 py-0.5 text-rose-400",
        className,
      )}
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(delta)} places`}
    >
      {up ? (
        <TrendingUp className="size-3.5" aria-hidden />
      ) : (
        <TrendingDown className="size-3.5" aria-hidden />
      )}
      {Math.abs(delta)}
    </span>
  );
}
