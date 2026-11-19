"use client";

import { RotateCcw, X } from "lucide-react";
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
  pendingOutSlots,
  onSlotPress,
  onUndoPending,
  onRemove,
  showRoleBadges = true,
  captainMultiplier,
  pitchClassName,
}: {
  selection: readonly (string | null)[];
  captainPlayerId: string | null;
  viceCaptainPlayerId: string | null;
  playerById: Map<string, PickTeamPlayerRow>;
  disabled?: boolean;
  pendingOutSlots: readonly number[];
  onSlotPress: (slotIndex: number) => void;
  onUndoPending: (slotIndex: number) => void;
  /** Shortcut to take a player out; the X is hidden when omitted. */
  onRemove?: (slotIndex: number) => void;
  showRoleBadges?: boolean;
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
          const isPendingOut =
            pendingOutSlots.includes(index) && playerId != null;
          const outgoing = isPendingOut ? playerById.get(playerId!) : null;
          // A transferred-out slot reads as empty until a replacement is picked.
          const player =
            playerId && !isPendingOut ? playerById.get(playerId) : null;
          const isCaptain = playerId != null && playerId === captainPlayerId;
          const isVice = playerId != null && playerId === viceCaptainPlayerId;

          return (
            <div key={index} className={cn("relative", layoutClass)}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSlotPress(index)}
                className={cn(
                  "group/slot flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-background/60 px-2 py-3 text-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:opacity-70",
                  !player &&
                    "border-dashed hover:border-primary/40 hover:bg-primary/5",
                  player && !isPendingOut && "hover:border-primary/30",
                )}
                aria-label={
                  player
                    ? `${player.displayName}, slot ${index + 1}. Tap to change.`
                    : outgoing
                      ? `${outgoing.displayName} transferred out of slot ${index + 1}. Tap to choose a replacement.`
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
                      {outgoing
                        ? `Replace ${outgoing.displayName}`
                        : "Add player"}
                    </span>
                  </>
                )}
              </button>
              {player && !disabled && onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${player.displayName} from slot ${index + 1}`}
                  className="absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90"
                >
                  <X className="size-3.5" aria-hidden strokeWidth={2.5} />
                </button>
              ) : null}
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
