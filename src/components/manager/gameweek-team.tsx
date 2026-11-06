import { GameweekTeamBody } from "@/components/manager/gameweek-team-body";
import { FantasyTeamCard } from "@/components/manager/fantasy-team-card";
import type { FantasyTeamView } from "@/server/queries/fantasy-team-view";
import type {
  ManagerLine,
  PlayerPointEvent,
} from "@/server/queries/manager-score-lines";

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
  events,
  emptyTitle,
  emptyMessage,
}: {
  number: number;
  playedOn: string;
  totalPoints?: number | null;
  rankAfter?: number | null;
  team: FantasyTeamView;
  lines?: Record<string, ManagerLine>;
  events?: Record<string, PlayerPointEvent[]>;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const visible = team.visibility === "visible" && team.slots.length > 0;
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
        <GameweekTeamBody
          gameweek={number}
          slots={team.slots}
          lines={lines}
          events={events}
        />
      )}
    </article>
  );
}
