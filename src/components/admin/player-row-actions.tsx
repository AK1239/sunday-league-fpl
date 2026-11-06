"use client";

import { useTransition } from "react";
import { toastActionResult } from "@/lib/app-toast";
import {
  deactivatePlayerAction,
  reactivatePlayerAction,
  updatePlayerAction,
} from "@/server/actions/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlayerRowActions({
  player,
}: {
  player: {
    id: string;
    displayName: string;
    active: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      {!player.active ? (
        <span className="hidden text-xs text-muted-foreground sm:mr-1 sm:block sm:w-16 sm:shrink-0">
          Inactive
        </span>
      ) : null}
      <form
        className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
        action={async (formData) => {
          startTransition(async () => {
            const result = await updatePlayerAction(player.id, formData);
            toastActionResult(result, "Player updated");
          });
        }}
      >
        <Input
          name="displayName"
          defaultValue={player.displayName}
          aria-label={`Display name for ${player.displayName}`}
          className="min-w-0 flex-1"
          required
          disabled={pending}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Save
        </Button>
      </form>
      {player.active ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deactivatePlayerAction(player.id);
              toastActionResult(result, "Player deactivated");
            })
          }
        >
          Deactivate
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await reactivatePlayerAction(player.id);
              toastActionResult(result, "Player reactivated");
            })
          }
        >
          Reactivate
        </Button>
      )}
    </div>
  );
}
