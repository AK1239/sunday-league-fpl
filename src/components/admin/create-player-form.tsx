"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { createPlayerAction } from "@/server/actions/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KIT_SELECT_OPTIONS } from "@/lib/kits";
import type { ActionResult } from "@/server/actions/action-result";

export function CreatePlayerForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  /** Parent often passes `() => setX(...)` which is a new fn each render — must not be a `useEffect` dependency or success runs every render while `state.ok` stays true (infinite refresh). */
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [state, action, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (_prev, formData) => createPlayerAction(formData), null);
  useActionResultToast(state, "Player added");

  useEffect(() => {
    if (!state?.ok) return;
    onSuccessRef.current?.();
    router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="create-displayName">Display name</Label>
        <Input
          id="create-displayName"
          name="displayName"
          required
          disabled={pending}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-kitKey">Shirt</Label>
        <select
          id="create-kitKey"
          name="kitKey"
          defaultValue="neutral"
          disabled={pending}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {KIT_SELECT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-avatar">Avatar (optional)</Label>
        <Input
          id="create-avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
        />
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Add player"}
      </Button>
    </form>
  );
}
