import { cn } from "@/lib/utils";

export function ScoreCard({
  teamA,
  teamB,
  className,
}: {
  teamA: { name: string; score: number };
  teamB: { name: string; score: number };
  className?: string;
}) {
  const aWins = teamA.score > teamB.score;
  const bWins = teamB.score > teamA.score;

  return (
    <div
      className={cn(
        "surface surface-hover grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl px-4 py-4",
        className,
      )}
    >
      <div className="min-w-0 text-right">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            aWins ? "text-team-a" : "text-foreground",
          )}
        >
          {teamA.name}
        </p>
      </div>
      <p className="font-heading rounded-xl bg-background/50 px-3 py-1 text-2xl font-bold tabular-nums tracking-tight">
        <span className={aWins ? "text-team-a" : undefined}>{teamA.score}</span>
        <span className="mx-1.5 text-muted-foreground">–</span>
        <span className={bWins ? "text-team-b" : undefined}>{teamB.score}</span>
      </p>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            bWins ? "text-team-b" : "text-foreground",
          )}
        >
          {teamB.name}
        </p>
      </div>
    </div>
  );
}
