"use client";

import { RotateCcw } from "lucide-react";
import { EmptyShirt } from "@/components/fantasy/empty-shirt";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
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

export function TransferPitchSlots({
  selection,
  captainPlayerId,
  viceCaptainPlayerId,
  playerById,
  disabled,
  pendingOutSlot,
  incomingIds,
  onSlotPress,
  onUndoPending,
  showRoleBadges = true,
  showIncomingBadges = true,
  captainMultiplier,
  pitchClassName,
}: {
  selection: readonly (string | null)[];
  captainPlayerId: string | null;
  viceCaptainPlayerId: string | null;
  playerById: Map<string, PickTeamPlayerRow>;
  disabled?: boolean;
  pendingOutSlot: number | null;
  incomingIds: ReadonlySet<string>;
  onSlotPress: (slotIndex: number) => void;
  onUndoPending: (slotIndex: number) => void;
  showRoleBadges?: boolean;
  showIncomingBadges?: boolean;
  captainMultiplier?: 2 | 3;
  pitchClassName?: string;
}) {
  return (
    <div
      className={cn(
        "surface relative mx-auto aspect-[4/5] max-w-sm rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/10 via-card/80 to-card/40 p-4",
        pitchClassName,
      )}
      aria-label="Your five-a-side lineup"
    >
      <div
        className="pointer-events-none absolute inset-4 rounded-2xl border border-dashed border-primary/20"
        aria-hidden
      />
      <div className="grid h-full grid-cols-2 grid-rows-3 gap-3">
        {SLOT_LAYOUT.map((layoutClass, index) => {
          const playerId = selection[index] ?? null;
          const isPendingOut = pendingOutSlot === index && playerId != null;
          const player = playerId ? playerById.get(playerId) : null;
          const isCaptain = playerId != null && playerId === captainPlayerId;
          const isVice = playerId != null && playerId === viceCaptainPlayerId;
          const isIncoming =
            playerId != null && incomingIds.has(playerId) && !isPendingOut;

          return (
            <div key={index} className={cn("relative", layoutClass)}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSlotPress(index)}
                className={cn(
                  "group/slot flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-background/60 px-2 py-3 text-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:opacity-70",
                  isPendingOut && "opacity-60 grayscale",
                  !player &&
                    "border-dashed hover:border-primary/40 hover:bg-primary/5",
                  player && !isPendingOut && "hover:border-primary/30",
                )}
                aria-label={
                  player
                    ? `${player.displayName}, slot ${index + 1}. Tap to change.`
                    : `Empty slot ${index + 1}.`
                }
              >
                {player ? (
                  <>
                    <div className="relative">
                      <PlayerShirt
                        name={player.displayName}
                        kitKey={player.kitKey}
                        size="lg"
                      />
                      {showRoleBadges && isCaptain ? (
                        <CaptainBadge
                          role="captain"
                          captainMultiplier={captainMultiplier}
                          className="absolute -right-1 -bottom-1"
                        />
                      ) : null}
                      {showRoleBadges && isVice ? (
                        <CaptainBadge
                          role="vice_captain"
                          className="absolute -right-1 -top-1"
                        />
                      ) : null}
                      {isPendingOut ? (
                        <span className="absolute -left-1 -top-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                          Out
                        </span>
                      ) : null}
                      {showIncomingBadges && isIncoming ? (
                        <span className="absolute -left-1 -top-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
                          In
                        </span>
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
                    <EmptyShirt size="lg" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Add player
                    </span>
                  </>
                )}
              </button>
              {isPendingOut && !disabled ? (
                <button
                  type="button"
                  onClick={() => onUndoPending(index)}
                  className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium shadow-sm"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  Undo
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
