"use client";

import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { KitPicker } from "@/components/admin/kit-picker";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastActionResult } from "@/lib/app-toast";
import { isKitKey, type KitKey } from "@/lib/kits";
import { updatePlayerAction } from "@/server/actions/players";

export function EditPlayerModal({
  open,
  onClose,
  player,
}: {
  open: boolean;
  onClose: () => void;
  player: { id: string; displayName: string; kitKey: string | null };
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(player.displayName);
  const [kit, setKit] = useState<KitKey>(
    player.kitKey && isKitKey(player.kitKey) ? player.kitKey : "neutral",
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Edit player"
      description={player.displayName}
    >
      <form
        className="space-y-5"
        action={(formData) => {
          startTransition(async () => {
            const result = await updatePlayerAction(player.id, formData);
            toastActionResult(result, "Player updated");
            if (result.ok) onClose();
          });
        }}
      >
        <div className="flex justify-center rounded-2xl bg-gradient-to-b from-primary/15 to-transparent py-4">
          <PlayerShirt
            name={name || player.displayName}
            kitKey={kit}
            size="xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`edit-name-${player.id}`}>Display name</Label>
          <Input
            id={`edit-name-${player.id}`}
            name="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label>Shirt</Label>
          <KitPicker
            value={kit}
            onChange={setKit}
            playerName={name || player.displayName}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`edit-avatar-${player.id}`}>
            Avatar{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id={`edit-avatar-${player.id}`}
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
