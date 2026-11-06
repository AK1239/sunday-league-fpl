import { cn } from "@/lib/utils";
import type { TransferWindowSummary } from "@/server/fantasy/transfer-summary";

export function TransferSummaryStrip({
  summary,
  freeAvailable,
  className,
}: {
  summary: TransferWindowSummary;
  freeAvailable: number;
  className?: string;
}) {
  const penalty = summary.transferPenalty;
  const hasPenalty = penalty < 0;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-card/60 p-3 text-sm sm:grid-cols-4",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <Stat label="Free available" value={String(freeAvailable)} />
      <Stat label="Made" value={String(summary.made)} />
      <Stat label="Extra" value={String(summary.extra)} />
      <Stat
        label="Penalty"
        value={hasPenalty ? String(penalty) : "0"}
        className={cn(
          hasPenalty && "text-amber-600 dark:text-amber-400",
          summary.extra > 1 && hasPenalty && "text-destructive",
        )}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("font-heading text-xl font-semibold tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}
