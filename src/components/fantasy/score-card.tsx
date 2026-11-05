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
        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border/60 bg-card/90 px-3 py-3",
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
      <p className="font-heading text-xl font-bold tabular-nums tracking-tight">
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
