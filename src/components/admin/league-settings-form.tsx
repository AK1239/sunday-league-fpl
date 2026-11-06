"use client";

import { useActionState } from "react";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { Settings2 } from "lucide-react";
import { updateLeagueSettingsAction } from "@/server/actions/league-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";

function kickoffForInput(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

async function saveAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return updateLeagueSettingsAction(formData);
}

export function LeagueSettingsForm({
  timezone,
  defaultKickoffTime,
  deadlineOffsetMinutes,
}: {
  timezone: string;
  defaultKickoffTime: string;
  deadlineOffsetMinutes: number;
}) {
  const [state, formAction, pending] = useActionState(saveAction, null);
  useActionResultToast(state, "Settings saved");

  return (
    <form action={formAction} className="space-y-4 surface rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Settings2 className="size-5" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold">League defaults</h2>
          <p className="text-sm text-muted-foreground">
            Used when scheduling new gameweeks (kickoff minus offset = deadline).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          defaultValue={timezone}
          required
          disabled={pending}
          placeholder="Africa/Dar_es_Salaam"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="defaultKickoffTime">Default kickoff</Label>
          <Input
            id="defaultKickoffTime"
            name="defaultKickoffTime"
            type="time"
            defaultValue={kickoffForInput(defaultKickoffTime)}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadlineOffsetMinutes">Deadline offset (minutes)</Label>
          <Input
            id="deadlineOffsetMinutes"
            name="deadlineOffsetMinutes"
            type="number"
            min={0}
            defaultValue={deadlineOffsetMinutes}
            required
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            0 = deadline at kickoff. Positive = earlier.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
