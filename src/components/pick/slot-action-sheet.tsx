"use client";

import {
  ArrowLeftRight,
  Crown,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { cn } from "@/lib/utils";

type Action = {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  hidden?: boolean;
};

export function SlotActionSheet({
  open,
  onClose,
  playerName,
  playerKitKey,
  isCaptain,
  isVice,
  onMakeCaptain,
  onMakeVice,
  onRemove,
  onReplace,
  onViewPlayer,
  showSquadEditActions = true,
  showCaptainActions = true,
  transferMode = false,
}: {
  open: boolean;
  onClose: () => void;
  playerName: string;
  playerKitKey?: string | null;
  isCaptain: boolean;
  isVice: boolean;
  onMakeCaptain: () => void;
  onMakeVice: () => void;
  onRemove?: () => void;
  onReplace?: () => void;
  onViewPlayer?: () => void;
  /** Replace / remove — hidden on read-only views like My Team. */
  showSquadEditActions?: boolean;
  /** Captain / vice actions (transfer wizard step 2). */
  showCaptainActions?: boolean;
  /** Transfers screen: transfer out + free captain labels. */
  transferMode?: boolean;
}) {
  const actions: Action[] = [
    ...(showCaptainActions
      ? [
          {
            key: "captain",
            label: "Make captain",
            hint: transferMode
              ? "Free — your points are multiplied ×2"
              : "Your points are multiplied ×2",
            icon: <Crown />,
            onSelect: onMakeCaptain,
            hidden: isCaptain,
          } satisfies Action,
          {
            key: "vice",
            label: "Make vice-captain",
            hint: transferMode
              ? "Free — your points are multiplied ×1.5"
              : "Your points are multiplied ×1.5",
            icon: <ShieldCheck />,
            onSelect: onMakeVice,
            hidden: isVice,
          } satisfies Action,
        ]
      : []),
    ...(showSquadEditActions && onReplace
      ? [
          {
            key: "replace",
            label: transferMode ? "Transfer out" : "Replace player",
            hint: transferMode
              ? "Pick a replacement player"
              : "Swap for someone else",
            icon: <ArrowLeftRight />,
            onSelect: onReplace,
          } satisfies Action,
        ]
      : []),
    ...(showSquadEditActions && onRemove
      ? [
          {
            key: "remove",
            label: "Remove from team",
            hint: "Free up this slot",
            icon: <Trash2 />,
            onSelect: onRemove,
            tone: "danger" as const,
          } satisfies Action,
        ]
      : []),
    ...(onViewPlayer
      ? [
          {
            key: "view",
            label: "View player",
            hint: "Stats and season history",
            icon: <UserRound />,
            onSelect: onViewPlayer,
          } satisfies Action,
        ]
      : []),
  ];

  const role = isCaptain ? "Captain" : isVice ? "Vice-captain" : "Squad player";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={playerName}
      description={role}
      leading={
        <PlayerShirt name={playerName} kitKey={playerKitKey} size="lg" />
      }
    >
      <ul className="space-y-2 pt-1" role="menu">
        {actions
          .filter((a) => !a.hidden)
          .map((a, i) => (
            <li
              key={a.key}
              role="none"
              className="animate-rise"
              style={{ "--d": `${80 + i * 50}ms` } as React.CSSProperties}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  a.onSelect();
                  onClose();
                }}
                className={cn(
                  "group flex w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                  a.tone === "danger"
                    ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                    : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
                    a.tone === "danger"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {a.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-medium",
                      a.tone === "danger" && "text-destructive",
                    )}
                  >
                    {a.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {a.hint}
                  </span>
                </span>
              </button>
            </li>
          ))}
      </ul>
    </BottomSheet>
  );
}
