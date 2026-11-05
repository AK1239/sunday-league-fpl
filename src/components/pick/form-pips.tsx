import { cn } from "@/lib/utils";

/** Compact recent-gameweek points for picker rows. */
export function FormPips({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <ul
      className={cn("flex items-end gap-0.5", className)}
      aria-label="Recent form"
    >
      {values.map((value, index) => (
        <li key={index} className="flex flex-col items-center gap-0.5">
          <span className="sr-only">
            GW {index + 1}: {value} pts
          </span>
          <span
            className="block w-1.5 rounded-full bg-primary/70"
            style={{ height: `${Math.max(4, (value / max) * 16)}px` }}
            aria-hidden
          />
        </li>
      ))}
    </ul>
  );
}
