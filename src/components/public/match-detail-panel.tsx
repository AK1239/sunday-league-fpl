import {
  Ban,
  Footprints,
  Goal,
  Hand,
  ShieldCheck,
  Star,
  Target,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/fantasy/page-header";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { getDb } from "@/server/db";
import {
  getPublicMatchDetail,
  type PublicMatchDetail,
} from "@/server/queries/public-players";
import { cn } from "@/lib/utils";

type Side = "A" | "B";

const SIDE = {
  A: {
    label: "Side A",
    text: "text-team-a",
    bg: "bg-team-a/15",
    border: "border-team-a/30",
    top: "border-t-team-a",
    dot: "bg-team-a",
  },
  B: {
    label: "Side B",
    text: "text-team-b",
    bg: "bg-team-b/15",
    border: "border-team-b/30",
    top: "border-t-team-b",
    dot: "bg-team-b",
  },
} as const;

function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export async function MatchDetailPanel({ matchId }: { matchId: string }) {
  await connection();
  const detail = await getPublicMatchDetail(getDb(), matchId);
  if (!detail) notFound();

  const { scoreA, scoreB } = detail.match;
  const result =
    scoreA === scoreB ? "Draw" : scoreA > scoreB ? "Side A win" : "Side B win";

  return (
    <div className="space-y-8">
      <Link
        href={`/matchdays/${detail.match.matchdayId}`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← GW{detail.match.matchdayNumber}
      </Link>

      <PageHeader
        eyebrow={formatDay(detail.match.playedOn)}
        title={`Match ${detail.match.matchNo}`}
        description={`Gameweek ${detail.match.matchdayNumber} · lineups and events from published results.`}
      />

      <Scoreboard detail={detail} result={result} />

      <div className="grid gap-4 sm:grid-cols-2">
        <LineupCard side="A" detail={detail} />
        <LineupCard side="B" detail={detail} />
      </div>

      <GoalsTimeline detail={detail} />
      <Incidents detail={detail} />
    </div>
  );
}

function Scoreboard({
  detail,
  result,
}: {
  detail: PublicMatchDetail;
  result: string;
}) {
  const { scoreA, scoreB } = detail.match;
  const aWins = scoreA > scoreB;
  const bWins = scoreB > scoreA;
  return (
    <section
      aria-label="Final score"
      className="surface relative overflow-hidden rounded-3xl px-4 py-7 sm:py-9"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div className="min-w-0 text-right">
          <p
            className={cn(
              "font-heading text-lg font-semibold sm:text-2xl",
              aWins ? SIDE.A.text : "text-foreground",
            )}
          >
            Side A
          </p>
          <p className="text-xs text-muted-foreground">
            {detail.sideA.playerNames.length} players
          </p>
        </div>

        <p className="font-heading flex items-center gap-2 rounded-2xl bg-background/60 px-5 py-2 text-5xl font-bold tabular-nums sm:gap-3 sm:px-8 sm:text-7xl">
          <span className={aWins ? SIDE.A.text : undefined}>{scoreA}</span>
          <span className="text-2xl text-muted-foreground sm:text-4xl">–</span>
          <span className={bWins ? SIDE.B.text : undefined}>{scoreB}</span>
        </p>

        <div className="min-w-0">
          <p
            className={cn(
              "font-heading text-lg font-semibold sm:text-2xl",
              bWins ? SIDE.B.text : "text-foreground",
            )}
          >
            Side B
          </p>
          <p className="text-xs text-muted-foreground">
            {detail.sideB.playerNames.length} players
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-border/60 bg-background/50 px-3 py-1 font-medium">
          {result}
        </span>
        {detail.mvpPlayerName ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-podium-gold/40 bg-podium-gold/10 px-3 py-1 font-medium text-podium-gold">
            <Star className="size-3.5" aria-hidden />
            MVP {detail.mvpPlayerName}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/** Small icon + count pill used on lineup rows. */
function StatChip({
  icon,
  label,
  count,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  tone?: "primary" | "danger" | "gold" | "muted";
}) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums [&_svg]:size-3",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "danger" && "bg-destructive/15 text-destructive",
        tone === "gold" && "bg-podium-gold/15 text-podium-gold",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {icon}
      {count && count > 1 ? `×${count}` : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function LineupCard({
  side,
  detail,
}: {
  side: Side;
  detail: PublicMatchDetail;
}) {
  const st = SIDE[side];
  const block = side === "A" ? detail.sideA : detail.sideB;

  // Per-player tallies from the goal and incident lists (display names are unique).
  const tally = (name: string) => {
    let goals = 0;
    let assists = 0;
    let ownGoals = 0;
    for (const g of detail.goals) {
      if (g.kind === "own_goal") {
        if (g.scorerName === name) ownGoals++;
      } else if (g.scorerName === name) {
        goals++;
      }
      if (g.assistName === name) assists++;
    }
    const saves = detail.incidents.filter(
      (i) => i.playerName === name && i.kind === "penalty_saved",
    ).length;
    const missed = detail.incidents.filter(
      (i) => i.playerName === name && i.kind === "penalty_missed",
    ).length;
    return { goals, assists, ownGoals, saves, missed };
  };

  return (
    <section
      aria-label={st.label}
      className={cn(
        "surface overflow-hidden rounded-2xl border-t-2 p-4",
        st.top,
      )}
    >
      <h3
        className={cn(
          "flex items-center gap-2 text-xs font-semibold tracking-widest uppercase",
          st.text,
        )}
      >
        <span aria-hidden className={cn("size-2 rounded-full", st.dot)} />
        {st.label}
        <span className="font-normal tracking-normal text-muted-foreground normal-case">
          · {block.players.length} players
        </span>
      </h3>

      <ul className="mt-3 divide-y divide-border/40">
        {block.players.map((player) => {
          const t = tally(player.name);
          const isGk = block.goalkeeperName === player.name;
          const isMvp = detail.mvpPlayerName === player.name;
          return (
            <li
              key={player.id}
              className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
            >
              <PlayerShirt
                name={player.name}
                kitKey={player.kitKey}
                size="sm"
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {player.name}
              </span>
              <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {isGk ? (
                  <StatChip icon={<Hand />} label="Goalkeeper" tone="gold" />
                ) : null}
                {t.goals > 0 ? (
                  <StatChip icon={<Goal />} label="Goals" count={t.goals} />
                ) : null}
                {t.assists > 0 ? (
                  <StatChip
                    icon={<Footprints />}
                    label="Assists"
                    count={t.assists}
                  />
                ) : null}
                {t.saves > 0 ? (
                  <StatChip
                    icon={<ShieldCheck />}
                    label="Penalty saved"
                    count={t.saves}
                  />
                ) : null}
                {t.missed > 0 ? (
                  <StatChip
                    icon={<Ban />}
                    label="Missed penalty"
                    count={t.missed}
                    tone="muted"
                  />
                ) : null}
                {t.ownGoals > 0 ? (
                  <StatChip
                    icon={<Undo2 />}
                    label="Own goal"
                    count={t.ownGoals}
                    tone="danger"
                  />
                ) : null}
                {isMvp ? (
                  <StatChip icon={<Star />} label="MVP" tone="gold" />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GoalsTimeline({ detail }: { detail: PublicMatchDetail }) {
  // Running scoreline after each goal (an own goal counts for the credited side).
  let a = 0;
  let b = 0;
  const rows = detail.goals.map((goal) => {
    if (goal.side === "A") a++;
    else b++;
    return { goal, a, b };
  });

  return (
    <section aria-labelledby="goals-heading">
      <h2
        id="goals-heading"
        className="font-heading mb-3 flex items-center gap-2 text-lg font-semibold"
      >
        <Goal className="size-5 text-primary" aria-hidden />
        Goals
        <span className="text-sm font-normal text-muted-foreground">
          · {detail.goals.length}
        </span>
      </h2>

      {rows.length === 0 ? (
        <p className="surface flex items-center gap-3 rounded-2xl px-4 py-5 text-sm text-muted-foreground">
          <Target className="size-5" aria-hidden />
          No goals in this match.
        </p>
      ) : (
        <ol className="surface divide-y divide-border/40 overflow-hidden rounded-2xl">
          {rows.map(({ goal, a: sa, b: sb }, index) => {
            const st = SIDE[goal.side];
            const own = goal.kind === "own_goal";
            return (
              <li
                key={index}
                className="flex items-center gap-3 px-4 py-3 sm:gap-4"
              >
                <span
                  className="font-heading w-14 shrink-0 rounded-lg bg-background/60 py-1 text-center text-sm font-bold tabular-nums"
                  title="Score after this goal"
                >
                  <span className={goal.side === "A" ? SIDE.A.text : undefined}>
                    {sa}
                  </span>
                  <span className="mx-1 text-muted-foreground">–</span>
                  <span className={goal.side === "B" ? SIDE.B.text : undefined}>
                    {sb}
                  </span>
                </span>

                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-[1.1rem]",
                    own
                      ? "bg-destructive/15 text-destructive"
                      : cn(st.bg, st.text),
                  )}
                >
                  {own ? <Undo2 /> : <Goal />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{goal.scorerName}</span>
                    {goal.kind === "penalty" ? (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary uppercase">
                        Penalty
                      </span>
                    ) : null}
                    {own ? (
                      <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-destructive uppercase">
                        Own goal
                      </span>
                    ) : null}
                  </p>
                  {goal.assistName ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Footprints className="size-3.5" aria-hidden />
                      <span className="sr-only">Assist:</span>
                      {goal.assistName}
                    </p>
                  ) : null}
                </div>

                <span
                  className={cn(
                    "hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
                    st.border,
                    st.text,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", st.dot)}
                  />
                  {st.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const INCIDENT_META = {
  penalty_saved: {
    icon: ShieldCheck,
    tone: "bg-primary/15 text-primary",
    text: "saved a penalty",
  },
  penalty_missed: {
    icon: Ban,
    tone: "bg-muted text-muted-foreground",
    text: "missed a penalty",
  },
  handball_blocked: {
    icon: Hand,
    tone: "bg-destructive/15 text-destructive",
    text: "handball stopped a goal",
  },
} as const;

function Incidents({ detail }: { detail: PublicMatchDetail }) {
  if (detail.incidents.length === 0) return null;
  return (
    <section aria-labelledby="incidents-heading">
      <h2
        id="incidents-heading"
        className="font-heading mb-3 flex items-center gap-2 text-lg font-semibold"
      >
        <Hand className="size-5 text-primary" aria-hidden />
        Other incidents
      </h2>
      <ul className="surface divide-y divide-border/40 overflow-hidden rounded-2xl">
        {detail.incidents.map((incident, index) => {
          const meta = INCIDENT_META[incident.kind];
          const Icon = meta.icon;
          const st = SIDE[incident.side];
          return (
            <li key={index} className="flex items-center gap-3 px-4 py-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-[1.1rem]",
                  meta.tone,
                )}
              >
                <Icon />
              </span>
              <p className="min-w-0 flex-1">
                <span className="font-semibold">{incident.playerName}</span>{" "}
                <span className="text-muted-foreground">{meta.text}</span>
              </p>
              <span
                className={cn(
                  "hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
                  st.border,
                  st.text,
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", st.dot)}
                />
                {st.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
