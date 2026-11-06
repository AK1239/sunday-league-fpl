"use client";

import { useActionState } from "react";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { updateTransferRulesAction } from "@/server/actions/admin-transfers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";

async function saveRules(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return updateTransferRulesAction(formData);
}

export function AdminTransferRulesForm({
  seasonId,
  ruleSetId,
  transfersStartMatchday,
  freeTransfersPerMatchday,
  maxBankedFreeTransfers,
  extraTransferPenalty,
  locked,
}: {
  seasonId: string;
  ruleSetId: string;
  transfersStartMatchday: number | null;
  freeTransfersPerMatchday: number;
  maxBankedFreeTransfers: number;
  extraTransferPenalty: number;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveRules, null);
  useActionResultToast(state, "Transfer rules saved");

  return (
    <form action={formAction} className="surface space-y-4 rounded-2xl p-5">
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="ruleSetId" value={ruleSetId} />
      <div>
        <h2 className="font-heading text-lg font-semibold">Transfer rules</h2>
        <p className="text-sm text-muted-foreground">
          {locked
            ? "Locked — a gameweek has already passed its deadline or been published."
            : "Enable transfers from a gameweek number (leave off for legacy picks)."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="transfersStartMatchday">Start gameweek</Label>
          <Input
            id="transfersStartMatchday"
            name="transfersStartMatchday"
            type="number"
            min={1}
            placeholder="Off (legacy)"
            defaultValue={transfersStartMatchday ?? ""}
            disabled={locked || pending}
          />
          <p className="text-xs text-muted-foreground">
            Empty = transfers off. Set to the first GW that uses transfer rules
            (e.g. 3).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="freeTransfersPerMatchday">Free per GW</Label>
          <Input
            id="freeTransfersPerMatchday"
            name="freeTransfersPerMatchday"
            type="number"
            min={0}
            defaultValue={freeTransfersPerMatchday}
            disabled={locked || pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxBankedFreeTransfers">Bank cap</Label>
          <Input
            id="maxBankedFreeTransfers"
            name="maxBankedFreeTransfers"
            type="number"
            min={0}
            defaultValue={maxBankedFreeTransfers}
            disabled={locked || pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="extraTransferPenalty">Hit per extra</Label>
          <Input
            id="extraTransferPenalty"
            name="extraTransferPenalty"
            type="number"
            min={1}
            defaultValue={extraTransferPenalty}
            disabled={locked || pending}
          />
        </div>
      </div>

      <Button type="submit" disabled={locked || pending}>
        {pending ? "Saving…" : "Save rules"}
      </Button>
    </form>
  );
}
