import Link from "next/link";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { CaptainBadge } from "@/components/pick/captain-badge";
import { cn } from "@/lib/utils";
import type { FantasyTeamPlayerSlot } from "@/server/queries/fantasy-team-view";
import type { ManagerLine } from "@/server/queries/manager-score-lines";

// 2-1-2, matching the Pick Team pitch.
const ROWS = [
  { count: 2, start: 0 },
  { count: 1, start: 2 },
  { count: 2, start: 3 },
] as const;

export function FantasyPitch({
  slots,
  lines,
  className,
}: {
  slots: FantasyTeamPlayerSlot[];
  lines?: Record<string, ManagerLine>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]",
        className,
      )}
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, oklch(0.5 0.12 150) 0 12.5%, oklch(0.45 0.12 150) 12.5% 25%)",
      }}
    >
      {/* Markings */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-white/35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-3 left-1/2 h-[16%] w-[52%] -translate-x-1/2 rounded-b-md border-2 border-t-0 border-white/35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-1/2 h-[16%] w-[52%] -translate-x-1/2 rounded-t-md border-2 border-b-0 border-white/35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25"
      />

      <div className="absolute inset-0 flex flex-col justify-around px-4 py-[7%]">
        {ROWS.map(({ count, start }, r) => (
          <div key={r} className="flex justify-evenly">
            {slots.slice(start, start + count).map((slot, i) => {
              const index = start + i;
              return (
                <PitchPlayer
                  key={slot.playerId}
                  slot={slot}
                  line={lines?.[slot.playerId]}
                  index={index}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PitchPlayer({
  slot,
  line,
  index,
}: {
  slot: FantasyTeamPlayerSlot;
  line?: ManagerLine;
  index: number;
}) {
  const scored = line != null;
  const dnp = scored && !line.attended;
  const boosted = scored && line.multiplier > 1;

  return (
    <Link
      href={`/players/${slot.playerId}`}
      className="group animate-rise flex w-[5.5rem] flex-col items-center outline-none sm:w-24"
      style={{ "--d": `${index * 90}ms` } as React.CSSProperties}
    >
      <div
        className={cn(
          "relative transition-transform duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1",
          dnp && "opacity-55 grayscale",
        )}
      >
        <PlayerShirt
          name={slot.displayName}
          size="lg"
          className="w-14 sm:w-16"
        />
        {slot.role === "captain" ? (
          <CaptainBadge role="captain" className="absolute -top-1 -right-2" />
        ) : null}
        {slot.role === "vice_captain" ? (
          <CaptainBadge
            role="vice_captain"
            className="absolute -top-1 -right-2"
          />
        ) : null}
        {boosted ? (
          <span className="absolute -bottom-1 -left-2 rounded-full bg-podium-gold px-1.5 py-0.5 text-[10px] leading-none font-extrabold text-black ring-2 ring-black/30">
            ×{line.multiplier}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 w-full overflow-hidden rounded-md text-center shadow-md ring-1 ring-black/20 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <p className="truncate bg-white px-1.5 py-0.5 text-xs font-semibold text-neutral-900">
          {slot.displayName}
        </p>
        {scored ? (
          <p
            className={cn(
              "px-1.5 py-0.5 text-xs font-bold tabular-nums",
              dnp
                ? "bg-neutral-800 text-neutral-400"
                : line.points > 0
                  ? "bg-neutral-900 text-primary"
                  : "bg-neutral-900 text-white",
            )}
          >
            {dnp ? "DNP" : line.points}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
