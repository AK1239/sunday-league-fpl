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
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        Last matchdays
      </p>
      <ul
        className="flex h-24 items-end gap-2"
        aria-label="Recent matchday points"
      >
        {values.map((value, index) => {
          const latest = index === values.length - 1;
          return (
            <li
              key={index}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="sr-only">
                Matchday {index + 1}: {value} points
              </span>
              <div
                className={cn(
                  "animate-grow-up w-full max-w-10 rounded-t-lg",
                  latest
                    ? "bg-gradient-to-t from-primary/60 to-primary shadow-[0_0_18px_-4px_var(--primary)]"
                    : "bg-gradient-to-t from-primary/15 to-primary/45",
                )}
                style={
                  {
                    height: `${Math.max(12, (value / max) * 64)}px`,
                    "--d": `${index * 70}ms`,
                  } as React.CSSProperties
                }
                aria-hidden
              />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
