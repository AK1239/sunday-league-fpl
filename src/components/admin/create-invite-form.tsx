"use client";

import { useActionState } from "react";
import { createManagerInviteAction } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";

type PlayerOption = { id: string; displayName: string };
type ManagerOption = { id: string; email: string; displayName: string };

async function createInviteStateAction(
  _prev: ActionResult<{ joinPath: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ joinPath: string }> | null> {
  return createManagerInviteAction(formData);
}

export function CreateInviteForm({
  players,
  managers,
}: {
  players: PlayerOption[];
  managers: ManagerOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createInviteStateAction,
    null,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="label">Label (optional)</Label>
        <Input
          id="label"
          name="label"
          placeholder="e.g. Yusuf"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Pre-fills display name on the join form.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="linkedPlayerId">Link to footballer (optional)</Label>
        <select
          id="linkedPlayerId"
          name="linkedPlayerId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending}
          defaultValue=""
        >
          <option value="">None</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resetUserId">Password reset for manager (optional)</Label>
        <select
          id="resetUserId"
          name="resetUserId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending}
          defaultValue=""
        >
          <option value="">New manager invite</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.email})
            </option>
          ))}
        </select>
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok === true && state.data?.joinPath ? (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
          role="status"
        >
          <p className="font-medium">One-time invite link (copy now):</p>
          <p className="mt-1 break-all font-mono text-xs">{state.data.joinPath}</p>
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invite"}
      </Button>
    </form>
  );
}
