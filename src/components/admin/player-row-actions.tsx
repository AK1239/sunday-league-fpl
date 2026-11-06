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
    nickname: string | null;
    joinedOn: string | null;
    active: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form
        className="flex flex-1 flex-wrap gap-2"
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
          className="min-w-[8rem] flex-1"
          required
          disabled={pending}
        />
        <Input
          name="nickname"
          defaultValue={player.nickname ?? ""}
          placeholder="Nickname"
          className="min-w-[6rem] flex-1"
          disabled={pending}
        />
        <Input
          name="joinedOn"
          type="date"
          defaultValue={player.joinedOn ?? ""}
          className="w-[9.5rem]"
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
