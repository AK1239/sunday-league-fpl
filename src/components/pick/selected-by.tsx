/** "Selected by X%" with a thin bar. Render only when the percent is available. */
export function SelectedBy({ percent }: { percent: number }) {
  return (
    <div
      className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"
      title={`${percent}% of teams have this player`}
    >
      <span
        aria-hidden
        className="h-1 w-14 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full bg-primary/70"
          style={{ width: `${Math.min(100, Math.max(percent, 0))}%` }}
        />
      </span>
      <span className="tabular-nums">{percent}% selected</span>
    </div>
  );
}
