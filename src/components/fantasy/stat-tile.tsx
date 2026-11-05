import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  className,
  style,
}: {
  label: string;
  value: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "animate-rise surface surface-hover rounded-2xl px-4 py-3.5",
        className,
      )}
    >
      <p className="text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-heading mt-1 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
