"use client";

import {
  ArrowRight,
  Crown,
  Equal,
  Footprints,
  Hand,
  ShieldAlert,
  Undo2,
  Shirt,
  ShieldCheck,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { cn } from "@/lib/utils";
import type { FantasyTeamPlayerSlot } from "@/server/queries/fantasy-team-view";
import type {
  ManagerLine,
  PlayerPointEvent,
} from "@/server/queries/manager-score-lines";

const KIND_META: Record<
  PlayerPointEvent["kind"],
  { label: string; plural?: string; icon: React.ReactNode; order: number }
> = {
  attendance: { label: "Played", icon: <Shirt />, order: 0 },
  win: { label: "Match win", plural: "Match wins", icon: <Trophy />, order: 1 },
  draw: { label: "Draw", plural: "Draws", icon: <Equal />, order: 2 },
  goal: { label: "Goal", plural: "Goals", icon: <Target />, order: 3 },
  assist: {
    label: "Assist",
    plural: "Assists",
    icon: <Footprints />,
    order: 4,
  },
  clean_sheet: {
    label: "Clean sheet",
    plural: "Clean sheets",
    icon: <ShieldCheck />,
    order: 5,
  },
  mvp: { label: "MVP", icon: <Star />, order: 6 },
  penalty_saved: {
    label: "Penalty saved",
    plural: "Penalties saved",
    icon: <ShieldAlert />,
    order: 7,
  },
  own_goal: {
    label: "Own goal",
    plural: "Own goals",
    icon: <Undo2 />,
    order: 8,
  },
  handball: {
    label: "Handball (goal stopped)",
    plural: "Handballs (goals stopped)",
    icon: <Hand />,
    order: 9,
  },
};

function roleLabel(role: FantasyTeamPlayerSlot["role"]) {
  return role === "captain"
    ? "Captain"
    : role === "vice_captain"
      ? "Vice-captain"
      : "Player";
}

export function PlayerPointsModal({
  open,
  onClose,
  gameweek,
  slot,
  line,
  events,
}: {
  open: boolean;
  onClose: () => void;
  gameweek: number;
  slot: FantasyTeamPlayerSlot | null;
  line?: ManagerLine;
  events?: PlayerPointEvent[];
}) {
  if (!slot) {
    return (
      <BottomSheet open={false} onClose={onClose} title="">
        {null}
      </BottomSheet>
    );
  }

  const sorted = [...(events ?? [])].sort(
    (a, b) => KIND_META[a.kind].order - KIND_META[b.kind].order,
  );
  const base = sorted.reduce((n, e) => n + e.points, 0);
  const boosted = line != null && line.multiplier > 1;
  const dnp = line != null && !line.attended;
  const total = line?.points ?? base;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={slot.displayName}
      description={`${roleLabel(slot.role)} · Gameweek ${gameweek}`}
      leading={
        <PlayerShirt name={slot.displayName} kitKey={slot.kitKey} size="lg" />
      }
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-end justify-between rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-widest text-primary uppercase">
              {boosted ? "Total (with multiplier)" : "Total points"}
            </p>
            {boosted ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {line.basePoints} × {line.multiplier}
              </p>
            ) : null}
          </div>
          <p className="font-heading text-5xl leading-none font-bold text-primary tabular-nums">
            {total}
          </p>
        </div>

        {dnp ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            {slot.displayName} didn&apos;t play this gameweek, so no points were
            scored.
          </p>
        ) : sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            No scoring events recorded.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((e, i) => {
              const meta = KIND_META[e.kind];
              const name =
                e.count > 1 ? (meta.plural ?? meta.label) : meta.label;
              return (
                <li
                  key={e.kind}
                  className="animate-rise flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5"
                  style={{ "--d": `${i * 45}ms` } as React.CSSProperties}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
                    {meta.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {name}
                    {e.count > 1 ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                        ×{e.count}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "font-heading text-lg font-semibold tabular-nums",
                      e.points > 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {e.points > 0 ? `+${e.points}` : e.points}
                  </span>
                </li>
              );
            })}

            {boosted ? (
              <li className="flex items-center gap-3 rounded-xl border border-podium-gold/30 bg-podium-gold/10 px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-podium-gold/20 text-podium-gold">
                  <Crown className="size-4" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium">
                  {slot.role === "captain" ? "Captain" : "Vice-captain"}{" "}
                  multiplier
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ×{line.multiplier}
                  </span>
                </span>
                <span className="font-heading text-lg font-semibold text-podium-gold tabular-nums">
                  +{line.points - line.basePoints}
                </span>
              </li>
            ) : null}
          </ul>
        )}

        <Link
          href={`/players/${slot.playerId}`}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          View player profile
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      </div>
    </BottomSheet>
  );
}
