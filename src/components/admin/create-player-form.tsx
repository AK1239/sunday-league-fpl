"use client";

import { useActionState } from "react";
import { createPlayerAction } from "@/server/actions/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";

export function CreatePlayerForm() {
  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (_prev, formData) => createPlayerAction(formData), null);

  return (
    <form
      action={action}
      className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4"
    >
      <h2 className="font-heading text-lg font-semibold">Add player</h2>
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nickname">Nickname (optional)</Label>
        <Input id="nickname" name="nickname" disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="joinedOn">Joined (optional)</Label>
        <Input id="joinedOn" name="joinedOn" type="date" disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatar">Avatar (optional)</Label>
        <Input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
        />
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm text-primary" role="status">
          Player added.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add player"}
      </Button>
    </form>
  );
}
