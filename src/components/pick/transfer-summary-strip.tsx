import { cn } from "@/lib/utils";
import type { TransferWindowSummary } from "@/server/fantasy/transfer-summary";

export function TransferSummaryStrip({
  summary,
  className,
  unlimitedLabel,
}: {
  summary: TransferWindowSummary;
  className?: string;
  unlimitedLabel?: string | null;
}) {
  const penalty = summary.transferPenalty;
  const hasPenalty = penalty < 0;

  if (unlimitedLabel) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-podium-gold/30 bg-podium-gold/10 px-4 py-3 text-sm font-medium",
          className,
        )}
        role="status"
      >
        {unlimitedLabel}
        {summary.made > 0 ? (
          <span className="text-muted-foreground">
            {" "}
            · {summary.made} change{summary.made === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    );
  }

  /** Only surface a hit when transfers exceed free allowance (`extra` > 0). */
  if (summary.extra === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
        Transfer hit
      </p>
      <p
        className={cn(
          "font-heading text-xl font-semibold tabular-nums",
          hasPenalty && "text-amber-600 dark:text-amber-400",
          summary.extra > 1 && hasPenalty && "text-destructive",
        )}
      >
        {hasPenalty ? String(penalty) : "0"} pts
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({summary.extra} extra transfer{summary.extra === 1 ? "" : "s"})
        </span>
      </p>
    </div>
  );
}
