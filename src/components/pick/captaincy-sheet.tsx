"use client";

import { Check, Crown, ShieldCheck } from "lucide-react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CaptaincyOption = {
  id: string;
  name: string;
  kitKey: string | null;
};

/**
 * One-screen captain + vice-captain picker. Each squad member gets a
 * "Captain" and a "Vice" button; a progress header shows what is still missing.
 */
export function CaptaincySheet({
  open,
  onClose,
  squad,
  captainPlayerId,
  viceCaptainPlayerId,
  onSetCaptain,
  onSetVice,
  captainMultiplier,
}: {
  open: boolean;
  onClose: () => void;
  squad: readonly CaptaincyOption[];
  captainPlayerId: string | null;
  viceCaptainPlayerId: string | null;
  onSetCaptain: (playerId: string) => void;
  onSetVice: (playerId: string) => void;
  captainMultiplier?: 2 | 3;
}) {
  const ready =
    captainPlayerId != null &&
    viceCaptainPlayerId != null &&
    captainPlayerId !== viceCaptainPlayerId;
  const multiplier = captainMultiplier ?? 2;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Captain & vice-captain"
      description={`Captain scores ${multiplier}× points`}
    >
      <ol className="mb-3 space-y-1.5 text-sm" aria-label="Progress">
        <Step done={captainPlayerId != null} label="Pick your captain" />
        <Step
          done={viceCaptainPlayerId != null}
          label="Pick your vice-captain"
        />
      </ol>

      <ul className="space-y-2">
        {squad.map((player) => {
          const isCaptain = player.id === captainPlayerId;
          const isVice = player.id === viceCaptainPlayerId;
          return (
            <li
              key={player.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2",
                isCaptain || isVice
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/50 bg-background/60",
              )}
            >
              <PlayerShirt
                name={player.name}
                kitKey={player.kitKey}
                size="sm"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {player.name}
              </span>
              <RoleButton
                active={isCaptain}
                disabled={isVice}
                onClick={() => onSetCaptain(player.id)}
                icon={<Crown className="size-3.5" aria-hidden />}
                label="Captain"
                ariaLabel={`Make ${player.name} captain`}
              />
              <RoleButton
                active={isVice}
                disabled={isCaptain}
                onClick={() => onSetVice(player.id)}
                icon={<ShieldCheck className="size-3.5" aria-hidden />}
                label="Vice"
                ariaLabel={`Make ${player.name} vice-captain`}
              />
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        size="lg"
        className="mt-4 w-full"
        disabled={!ready}
        onClick={onClose}
      >
        {ready ? "Done" : "Choose both to continue"}
      </Button>
    </BottomSheet>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2",
        done ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-5 items-center justify-center rounded-full border text-[10px]",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {done ? <Check className="size-3" /> : null}
      </span>
      <span className="font-medium">{label}</span>
      <span className="sr-only">{done ? "(done)" : "(to do)"}</span>
    </li>
  );
}

function RoleButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  ariaLabel,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-35",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
