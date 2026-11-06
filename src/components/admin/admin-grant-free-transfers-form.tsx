"use client";

import { useActionState } from "react";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { grantFreeTransfersAction } from "@/server/actions/admin-transfers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";

async function grant(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return grantFreeTransfersAction(formData);
}

export function AdminGrantFreeTransfersForm({
  managers,
  matchdays,
}: {
  managers: { id: string; displayName: string }[];
  matchdays: { id: string; number: number; playedOn: string }[];
}) {
  const [state, formAction, pending] = useActionState(grant, null);
  useActionResultToast(state, "Adjustment saved — windows updated if needed.");

  return (
    <form action={formAction} className="surface space-y-4 rounded-2xl p-5">
      <div>
        <h2 className="font-heading text-lg font-semibold">
          Grant free transfers
        </h2>
        <p className="text-sm text-muted-foreground">
          Adds to free availability for one gameweek only (audited). Rebuilds
          later windows and scores when penalties change.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grant-manager">Manager</Label>
          <select
            id="grant-manager"
            name="managerId"
            required
            disabled={pending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="grant-matchday">Gameweek</Label>
          <select
            id="grant-matchday"
            name="matchdayId"
            required
            disabled={pending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {matchdays.map((m) => (
              <option key={m.id} value={m.id}>
                GW{m.number} · {m.playedOn}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="grant-delta">Delta (+/−)</Label>
          <Input
            id="grant-delta"
            name="delta"
            type="number"
            required
            defaultValue={1}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="grant-reason">Reason</Label>
          <Input
            id="grant-reason"
            name="reason"
            required
            minLength={3}
            placeholder="Why this adjustment is needed"
            disabled={pending}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Grant adjustment"}
      </Button>
    </form>
  );
}
