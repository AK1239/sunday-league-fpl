"use client";

import { BottomSheet } from "@/components/pick/bottom-sheet";
import { Button } from "@/components/ui/button";

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
  return (
    <BottomSheet open={open} onClose={onClose} title={playerName}>
      <div className="flex flex-col gap-2 pb-6" role="menu">
        {!isCaptain ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            role="menuitem"
            onClick={() => {
              onMakeCaptain();
              onClose();
            }}
          >
            Make captain
          </Button>
        ) : null}
        {!isVice ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            role="menuitem"
            onClick={() => {
              onMakeVice();
              onClose();
            }}
          >
            Make vice-captain
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="justify-start"
          role="menuitem"
          onClick={() => {
            onReplace();
            onClose();
          }}
        >
          Replace player
        </Button>
        <Button
          type="button"
          variant="outline"
          className="justify-start text-destructive hover:text-destructive"
          role="menuitem"
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          Remove from team
        </Button>
      </div>
    </BottomSheet>
  );
}
