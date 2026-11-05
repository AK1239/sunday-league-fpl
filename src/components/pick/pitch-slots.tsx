"use client";

import { Plus } from "lucide-react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { CaptainBadge } from "@/components/pick/captain-badge";
import type { PickTeamPlayerRow } from "@/server/queries/pick-team-data";
import { cn } from "@/lib/utils";

const SLOT_LAYOUT = [
  "col-start-1 row-start-1",
  "col-start-2 row-start-1",
  "col-start-1 col-span-2 row-start-2 justify-self-center",
  "col-start-1 row-start-3",
  "col-start-2 row-start-3",
] as const;

export function PitchSlots({
  selection,
  captainPlayerId,
  viceCaptainPlayerId,
  playerById,
  disabled,
  onSlotPress,
}: {
  selection: readonly (string | null)[];
  captainPlayerId: string | null;
  viceCaptainPlayerId: string | null;
  playerById: Map<string, PickTeamPlayerRow>;
  disabled?: boolean;
  onSlotPress: (slotIndex: number) => void;
}) {
  return (
    <div
      className="surface relative mx-auto aspect-[4/5] max-w-sm rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/10 via-card/80 to-card/40 p-4"
      aria-label="Your five-a-side lineup"
    >
      <div
        className="pointer-events-none absolute inset-4 rounded-2xl border border-dashed border-primary/20"
        aria-hidden
      />
      <div className="grid h-full grid-cols-2 grid-rows-3 gap-3">
        {SLOT_LAYOUT.map((layoutClass, index) => {
          const playerId = selection[index] ?? null;
          const player = playerId ? playerById.get(playerId) : null;
          const isCaptain = playerId != null && playerId === captainPlayerId;
          const isVice = playerId != null && playerId === viceCaptainPlayerId;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSlotPress(index)}
              className={cn(
                "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-background/60 px-2 py-3 text-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
                layoutClass,
                !player &&
                  "border-dashed hover:border-primary/40 hover:bg-primary/5",
                player && "hover:border-primary/30",
              )}
              aria-label={
                player
                  ? `${player.displayName}, slot ${index + 1}. Tap to change role or remove.`
                  : `Empty slot ${index + 1}. Tap to add a player.`
              }
            >
              {player ? (
                <>
                  <div className="relative">
                    <PlayerAvatar
                      name={player.displayName}
                      avatarUrl={player.avatarUrl ?? undefined}
                      size="lg"
                    />
                    {isCaptain ? (
                      <CaptainBadge
                        role="captain"
                        className="absolute -right-1 -bottom-1"
                      />
                    ) : null}
                    {isVice ? (
                      <CaptainBadge
                        role="vice_captain"
                        className="absolute -right-1 -top-1"
                      />
                    ) : null}
                  </div>
                  <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                    {player.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {player.expectedPoints} xp
                  </span>
                </>
              ) : (
                <>
                  <Plus className="size-6 text-muted-foreground" aria-hidden />
                  <span className="text-xs text-muted-foreground">
                    Add player
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
