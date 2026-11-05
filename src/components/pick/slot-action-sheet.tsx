"use client";

import { ArrowLeftRight, Crown, ShieldCheck, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
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
  isCaptain,
  isVice,
  onMakeCaptain,
  onMakeVice,
  onRemove,
  onReplace,
}: {
  open: boolean;
  onClose: () => void;
  playerName: string;
  isCaptain: boolean;
  isVice: boolean;
  onMakeCaptain: () => void;
  onMakeVice: () => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const actions: Action[] = [
    {
      key: "captain",
      label: "Make captain",
      hint: "Your points are multiplied",
      icon: <Crown />,
      onSelect: onMakeCaptain,
      hidden: isCaptain,
    },
    {
      key: "vice",
      label: "Make vice-captain",
      hint: "Steps in if your captain doesn't play",
      icon: <ShieldCheck />,
      onSelect: onMakeVice,
      hidden: isVice,
    },
    {
      key: "replace",
      label: "Replace player",
      hint: "Swap for someone else",
      icon: <ArrowLeftRight />,
      onSelect: onReplace,
    },
    {
      key: "remove",
      label: "Remove from team",
      hint: "Free up this slot",
      icon: <Trash2 />,
      onSelect: onRemove,
      tone: "danger",
    },
  ];

  const role = isCaptain ? "Captain" : isVice ? "Vice-captain" : "Squad player";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={playerName}
      description={role}
      leading={<PlayerAvatar name={playerName} size="lg" />}
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
