"use client";

import { useActionState } from "react";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { InviteJoinLink } from "@/components/admin/invite-join-link";
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
  useActionResultToast(state, "Invite created");

  return (
    <form action={formAction} className="space-y-4 surface rounded-2xl p-5">
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
          className="flex h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm transition-all outline-none hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <Label htmlFor="resetUserId">
          Password reset for manager (optional)
        </Label>
        <select
          id="resetUserId"
          name="resetUserId"
          className="flex h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm transition-all outline-none hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
      {state?.ok === true && state.data?.joinPath ? (
        <InviteJoinLink joinPath={state.data.joinPath} />
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invite"}
      </Button>
    </form>
  );
}
