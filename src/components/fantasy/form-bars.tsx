import { cn } from "@/lib/utils";

export function FormBars({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Last matchdays
      </p>
      <ul
        className="flex items-end gap-1.5"
        aria-label="Recent matchday points"
      >
        {values.map((value, index) => (
          <li key={index} className="flex flex-1 flex-col items-center gap-1">
            <span className="sr-only">
              Matchday {index + 1}: {value} points
            </span>
            <div
              className="w-full max-w-[2.5rem] rounded-t-md bg-primary/80 motion-safe:transition-[height] motion-safe:duration-300"
              style={{ height: `${Math.max(12, (value / max) * 56)}px` }}
              aria-hidden
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
