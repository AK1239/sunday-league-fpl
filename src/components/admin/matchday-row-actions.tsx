"use client";

import { useActionState, useState } from "react";
import {
  cancelMatchdayAction,
  postponeMatchdayAction,
  updateMatchdayDeadlineAction,
} from "@/server/actions/matchdays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import type { ActionResult } from "@/server/actions/action-result";

type MatchdayRow = {
  id: string;
  number: number;
  playedOn: string;
  deadlineLocal: string;
  status: string;
};

async function deadlineAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return updateMatchdayDeadlineAction(formData);
}

async function postponeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return postponeMatchdayAction(formData);
}

export function MatchdayRowActions({
  matchday,
  timezone,
}: {
  matchday: MatchdayRow;
  timezone: string;
}) {
  const [deadlineState, deadlineFormAction, deadlinePending] = useActionState(
    deadlineAction,
    null,
  );
  const [postponeState, postponeFormAction, postponePending] = useActionState(
    postponeAction,
    null,
  );
  const [showPostpone, setShowPostpone] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canEdit = matchday.status !== "cancelled";
  const canPostpone =
    matchday.status === "scheduled" || matchday.status === "draft";
  const canCancel = matchday.status !== "cancelled";

  async function onCancel() {
    if (!confirm(`Cancel GW${matchday.number}? This removes it from scoring.`)) {
      return;
    }
    setCancelPending(true);
    setCancelError(null);
    const result = await cancelMatchdayAction(matchday.id);
    setCancelPending(false);
    if (result.ok === false) {
      setCancelError(result.message);
    }
  }

  if (!canEdit) {
    return (
      <p className="text-xs text-muted-foreground capitalize">{matchday.status}</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:max-w-md">
      <form action={deadlineFormAction} className="space-y-2">
        <input type="hidden" name="matchdayId" value={matchday.id} />
        <Label htmlFor={`deadline-${matchday.id}`} className="text-xs">
          Selection deadline ({timezone})
        </Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={`deadline-${matchday.id}`}
            name="deadlineAtLocal"
            type="datetime-local"
            defaultValue={matchday.deadlineLocal}
            disabled={deadlinePending}
            className="min-w-[12rem] flex-1"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={deadlinePending}>
            {deadlinePending ? "Saving…" : "Save deadline"}
          </Button>
        </div>
        {deadlineState?.ok === false ? (
          <FormError message={deadlineState.message} />
        ) : null}
      </form>

      {canPostpone ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPostpone((v) => !v)}
          >
            {showPostpone ? "Hide postpone" : "Postpone"}
          </Button>
          {showPostpone ? (
            <form action={postponeFormAction} className="space-y-2 rounded-xl border border-border/50 p-3">
              <input type="hidden" name="matchdayId" value={matchday.id} />
              <div className="space-y-2">
                <Label htmlFor={`postpone-${matchday.id}`}>New Sunday date</Label>
                <Input
                  id={`postpone-${matchday.id}`}
                  name="playedOn"
                  type="date"
                  defaultValue={matchday.playedOn}
                  required
                  disabled={postponePending}
                />
              </div>
              <Button type="submit" size="sm" disabled={postponePending}>
                {postponePending ? "Updating…" : "Apply new date"}
              </Button>
              {postponeState?.ok === false ? (
                <FormError message={postponeState.message} />
              ) : null}
            </form>
          ) : null}
        </div>
      ) : null}

      {canCancel ? (
        <div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={cancelPending}
            onClick={onCancel}
          >
            {cancelPending ? "Cancelling…" : "Cancel gameweek"}
          </Button>
          {cancelError ? <FormError message={cancelError} /> : null}
        </div>
      ) : null}
    </div>
  );
}
