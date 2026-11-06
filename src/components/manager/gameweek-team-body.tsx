"use client";

import { ChevronRight, Trophy } from "lucide-react";
import { useState } from "react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { FantasyPitch } from "@/components/manager/fantasy-pitch";
import { PlayerPointsModal } from "@/components/manager/player-points-modal";
import { cn } from "@/lib/utils";
import type { FantasyTeamPlayerSlot } from "@/server/queries/fantasy-team-view";
import type {
  ManagerLine,
  MatchdayScoreBreakdown,
  PlayerPointEvent,
} from "@/server/queries/manager-score-lines";

export function GameweekTeamBody({
  gameweek,
  slots,
  lines,
  events,
  scoreBreakdown,
}: {
  gameweek: number;
  slots: FantasyTeamPlayerSlot[];
  lines?: Record<string, ManagerLine>;
  events?: Record<string, PlayerPointEvent[]>;
  scoreBreakdown?: MatchdayScoreBreakdown | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function select(playerId: string) {
    setSelectedId(playerId);
    setOpen(true);
  }

  const hasLines = lines != null && Object.keys(lines).length > 0;
  const rows = slots
    .map((slot) => ({ slot, line: lines?.[slot.playerId] }))
    .sort((a, b) => (b.line?.points ?? 0) - (a.line?.points ?? 0));
  const maxPts = Math.max(1, ...rows.map((r) => r.line?.points ?? 0));
  const captainBonus = hasLines
    ? Object.values(lines!).reduce((n, l) => n + (l.points - l.basePoints), 0)
    : 0;
  const selected = slots.find((s) => s.playerId === selectedId) ?? null;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <FantasyPitch slots={slots} lines={lines} onSelectPlayer={select} />

        <div className="space-y-4">
          {scoreBreakdown &&
          (scoreBreakdown.transferPenalty < 0 ||
            scoreBreakdown.chipBonus > 0 ||
            scoreBreakdown.chipCode) ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              {scoreBreakdown.chipCode ? (
                <p className="font-medium capitalize">
                  {scoreBreakdown.chipCode.replace(/_/g, " ")}
                  {scoreBreakdown.chipBonus > 0
                    ? ` +${scoreBreakdown.chipBonus}`
                    : ""}
                </p>
              ) : null}
              {scoreBreakdown.transferPenalty < 0 ? (
                <>
                  <span className="font-medium">Transfers</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · squad {scoreBreakdown.squadPoints} pts · hit{" "}
                  </span>
                  <span className="font-semibold tabular-nums text-destructive">
                    {scoreBreakdown.transferPenalty}
                  </span>
                </>
              ) : null}
              <span className="text-muted-foreground">
                {" "}
                · total {scoreBreakdown.totalPoints}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Points breakdown
              <span className="ml-2 font-normal tracking-normal normal-case">
                · tap a player for details
              </span>
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
                  className="animate-rise"
                  style={{ "--d": `${i * 60}ms` } as React.CSSProperties}
                >
                  <button
                    type="button"
                    onClick={() => select(slot.playerId)}
                    className="surface surface-hover group relative block w-full overflow-hidden rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      <ChevronRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <PlayerPointsModal
        open={open}
        onClose={() => setOpen(false)}
        gameweek={gameweek}
        slot={selected}
        line={selected ? lines?.[selected.playerId] : undefined}
        events={selected ? events?.[selected.playerId] : undefined}
      />
    </>
  );
}
