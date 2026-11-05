import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 px-3 py-2.5",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-heading mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
