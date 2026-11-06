import { Trophy } from "lucide-react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { FantasyPitch } from "@/components/manager/fantasy-pitch";
import { FantasyTeamCard } from "@/components/manager/fantasy-team-card";
import { cn } from "@/lib/utils";
import type { FantasyTeamView } from "@/server/queries/fantasy-team-view";
import type { ManagerLine } from "@/server/queries/manager-score-lines";

function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function GameweekTeam({
  number,
  playedOn,
  totalPoints,
  rankAfter,
  team,
  lines,
  emptyTitle,
  emptyMessage,
}: {
  number: number;
  playedOn: string;
  totalPoints?: number | null;
  rankAfter?: number | null;
  team: FantasyTeamView;
  lines?: Record<string, ManagerLine>;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const visible = team.visibility === "visible" && team.slots.length > 0;
  const hasLines = visible && lines != null && Object.keys(lines).length > 0;

  const rows = visible
    ? team.slots
        .map((slot) => ({ slot, line: lines?.[slot.playerId] }))
        .sort((a, b) => (b.line?.points ?? 0) - (a.line?.points ?? 0))
    : [];
  const maxPts = Math.max(1, ...rows.map((r) => r.line?.points ?? 0));
  const captainBonus = hasLines
    ? Object.values(lines!).reduce((n, l) => n + (l.points - l.basePoints), 0)
    : 0;

  return (
    <article className="surface space-y-5 rounded-3xl p-5 sm:p-6">
      <header className="flex flex-wrap items-center gap-4">
        <div
          aria-hidden
          className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/20 to-primary/5"
        >
          <span className="text-[0.6rem] font-semibold tracking-widest text-primary uppercase">
            GW
          </span>
          <span className="font-heading -mt-0.5 text-2xl leading-none font-bold tabular-nums">
            {number}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-xl font-semibold">
            Gameweek {number}
          </h3>
          <p className="text-sm text-muted-foreground">{formatDay(playedOn)}</p>
        </div>
        <div className="flex items-center gap-4">
          {rankAfter != null ? (
            <div className="text-right">
              <p className="text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
                Rank
              </p>
              <p className="font-heading text-2xl font-semibold tabular-nums">
                #{rankAfter}
              </p>
            </div>
          ) : null}
          {totalPoints != null ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-right">
              <p className="text-[0.65rem] font-medium tracking-widest text-primary uppercase">
                Points
              </p>
              <p className="font-heading text-3xl leading-none font-bold text-primary tabular-nums">
                {totalPoints}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      {!visible ? (
        <FantasyTeamCard
          team={team}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <FantasyPitch slots={team.slots} lines={lines} />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Points breakdown
              </h4>
              {captainBonus > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-podium-gold/15 px-2.5 py-1 text-xs font-semibold text-podium-gold">
                  <Trophy className="size-3.5" aria-hidden />
                  Captain bonus +{captainBonus}
                </span>
              ) : null}
            </div>
            <ul className="space-y-2">
              {rows.map(({ slot, line }, i) => {
                const dnp = line != null && !line.attended;
                return (
                  <li
                    key={slot.playerId}
                    className="animate-rise surface relative overflow-hidden rounded-2xl"
                    style={{ "--d": `${i * 60}ms` } as React.CSSProperties}
                  >
                    {line ? (
                      <div
                        aria-hidden
                        className="absolute inset-y-0 left-0 bg-primary/10"
                        style={{ width: `${(line.points / maxPts) * 100}%` }}
                      />
                    ) : null}
                    <div className="relative flex items-center gap-3 px-3 py-2.5">
                      <PlayerShirt name={slot.displayName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {slot.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.role === "captain"
                            ? "Captain"
                            : slot.role === "vice_captain"
                              ? "Vice-captain"
                              : "Player"}
                          {dnp ? " · Did not play" : null}
                        </p>
                      </div>
                      {line ? (
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-heading text-xl font-bold tabular-nums",
                              dnp ? "text-muted-foreground" : "text-primary",
                            )}
                          >
                            {line.points}
                          </p>
                          {line.multiplier > 1 ? (
                            <p className="text-[0.65rem] text-podium-gold tabular-nums">
                              {line.basePoints} × {line.multiplier}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}
