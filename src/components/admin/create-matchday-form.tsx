"use client";

import { useActionState } from "react";
import { CalendarDays } from "lucide-react";
import { createMatchdayAction } from "@/server/actions/matchdays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import type { ActionResult } from "@/server/actions/action-result";

async function createStateAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return createMatchdayAction(formData);
}

export function CreateMatchdayForm({
  seasonId,
  timezone,
  nextNumber,
}: {
  seasonId: string;
  timezone: string;
  nextNumber: number;
}) {
  const [state, formAction, pending] = useActionState(createStateAction, null);

  return (
    <form action={formAction} className="space-y-4 surface rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <CalendarDays className="size-5" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold">Schedule gameweek</h2>
          <p className="text-sm text-muted-foreground">
            Default deadline uses league kickoff ({timezone}).
          </p>
        </div>
      </div>

      <input type="hidden" name="seasonId" value={seasonId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="playedOn">Sunday date</Label>
          <Input
            id="playedOn"
            name="playedOn"
            type="date"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="number">Gameweek #</Label>
          <Input
            id="number"
            name="number"
            type="number"
            min={1}
            defaultValue={nextNumber}
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadlineAtLocal">Custom deadline (optional)</Label>
        <Input
          id="deadlineAtLocal"
          name="deadlineAtLocal"
          type="datetime-local"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank for kickoff minus offset. Times are interpreted in{" "}
          {timezone}.
        </p>
      </div>

      {state?.ok === false ? <FormError message={state.message} /> : null}
      {state?.ok === true ? (
        <p className="text-sm text-primary" role="status">
          Matchday scheduled.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create matchday"}
      </Button>
    </form>
  );
}
