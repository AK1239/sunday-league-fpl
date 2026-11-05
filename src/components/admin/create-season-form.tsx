"use client";

import { useActionState } from "react";
import { createSeasonAction } from "@/server/actions/seasons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";

export function CreateSeasonForm() {
  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (_prev, formData) => createSeasonAction(formData), null);

  return (
    <form
      action={action}
      className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4"
    >
      <h2 className="font-heading text-lg font-semibold">New season</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Season 2 · Feb – Apr 2027"
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsOn">Starts</Label>
          <Input
            id="startsOn"
            name="startsOn"
            type="date"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsOn">Ends</Label>
          <Input
            id="endsOn"
            name="endsOn"
            type="date"
            required
            disabled={pending}
          />
        </div>
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm text-primary" role="status">
          Season created.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create season"}
      </Button>
    </form>
  );
}
