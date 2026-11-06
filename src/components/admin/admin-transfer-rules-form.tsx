"use client";

import { useActionState } from "react";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { updateTransferRulesAction } from "@/server/actions/admin-transfers";
import type { TransferRulesEditMode } from "@/server/domain/transfer-rules-admin";
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

function rulesHelpText(
  editMode: TransferRulesEditMode,
  minStartGameweek: number | null,
): string {
  switch (editMode) {
    case "editable":
      return "Set the first gameweek that uses transfer rules. Leave start empty to allow unrestricted picks every week.";
    case "enable_only":
      return minStartGameweek != null
        ? `Earlier gameweeks are already locked. Set start gameweek to ${minStartGameweek} or higher to turn transfers on from the next window (defaults for free/bank/hit stay as shown).`
        : "Turn transfers on by setting a start gameweek.";
    case "locked":
      return "Transfer rules are fixed for this season — a gameweek has locked and transfers are already configured.";
  }
}

export function AdminTransferRulesForm({
  seasonId,
  ruleSetId,
  transfersStartMatchday,
  freeTransfersPerMatchday,
  maxBankedFreeTransfers,
  extraTransferPenalty,
  editMode,
  minStartGameweek,
}: {
  seasonId: string;
  ruleSetId: string;
  transfersStartMatchday: number | null;
  freeTransfersPerMatchday: number;
  maxBankedFreeTransfers: number;
  extraTransferPenalty: number;
  editMode: TransferRulesEditMode;
  minStartGameweek: number | null;
}) {
  const [state, formAction, pending] = useActionState(saveRules, null);
  useActionResultToast(state, "Transfer rules saved");

  const economyLocked = editMode !== "editable";
  const startEditable = editMode !== "locked";
  const canSubmit = startEditable && !pending;

  return (
    <form action={formAction} className="surface space-y-4 rounded-2xl p-5">
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="ruleSetId" value={ruleSetId} />
      {economyLocked ? (
        <>
          <input
            type="hidden"
            name="freeTransfersPerMatchday"
            value={freeTransfersPerMatchday}
          />
          <input
            type="hidden"
            name="maxBankedFreeTransfers"
            value={maxBankedFreeTransfers}
          />
          <input
            type="hidden"
            name="extraTransferPenalty"
            value={extraTransferPenalty}
          />
        </>
      ) : null}
      <div>
        <h2 className="font-heading text-lg font-semibold">Transfer rules</h2>
        <p className="text-sm text-muted-foreground">
          {rulesHelpText(editMode, minStartGameweek)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="transfersStartMatchday">Start gameweek</Label>
          <Input
            id="transfersStartMatchday"
            name="transfersStartMatchday"
            type="number"
            min={minStartGameweek ?? 1}
            placeholder={
              minStartGameweek != null ? String(minStartGameweek) : "e.g. 1"
            }
            defaultValue={transfersStartMatchday ?? ""}
            disabled={!startEditable || pending}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to keep transfers off. Otherwise use the gameweek number
            when the transfer bank and −4 hits begin.
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
            disabled={economyLocked || pending}
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
            disabled={economyLocked || pending}
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
            disabled={economyLocked || pending}
          />
        </div>
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {pending ? "Saving…" : "Save rules"}
      </Button>
    </form>
  );
}
