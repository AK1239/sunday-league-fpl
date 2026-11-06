"use client";

import { Drawer } from "@/components/ui/drawer";
import { HoldToConfirmButton } from "@/components/pick/hold-to-confirm-button";
import { Button } from "@/components/ui/button";
import { CHIP_UI_COPY } from "@/server/chips/chip-ui-copy";
import type { ChipCode } from "@/server/chips/registry";
import type { ChipCardView } from "@/server/queries/chip-page-data";

export function ChipDetailDrawer({
  open,
  onClose,
  card,
  onContinueToTeam,
  onActivateTripleCaptain,
  activating,
  onCancelChip,
}: {
  open: boolean;
  onClose: () => void;
  card: ChipCardView | null;
  onContinueToTeam: (code: ChipCode) => void;
  onActivateTripleCaptain: () => void;
  activating: boolean;
  /** When provided and the chip is active, shows a cancel action instead of activate. */
  onCancelChip?: () => void;
}) {
  if (!card) return null;
  const copy = CHIP_UI_COPY[card.code];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={card.label}
      description={card.effectLine}
    >
      <div className="space-y-4">
        <span className="inline-block rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium">
          {copy.permanencePill}
        </span>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {copy.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-sm">
          <span className="font-medium text-foreground">Transfers: </span>
          {copy.transferNote}
        </p>
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-muted-foreground">
          {copy.risks}
        </p>
        <p className="text-xs text-muted-foreground">
          Can&apos;t be undone after the deadline. One use per season.
        </p>
        {card.status.kind === "active" && onCancelChip ? (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={activating}
            onClick={() => {
              onCancelChip();
              onClose();
            }}
          >
            Cancel {card.label}
          </Button>
        ) : card.code === "triple_captain" ? (
          <HoldToConfirmButton
            label="Hold to activate Triple Captain"
            confirming={activating}
            onConfirm={onActivateTripleCaptain}
          />
        ) : (
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              onContinueToTeam(card.code);
              onClose();
            }}
          >
            Continue to team
          </Button>
        )}
      </div>
    </Drawer>
  );
}
