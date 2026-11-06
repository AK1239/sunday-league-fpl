"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { createPlayerAction } from "@/server/actions/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KitPicker } from "@/components/admin/kit-picker";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import type { KitKey } from "@/lib/kits";
import type { ActionResult } from "@/server/actions/action-result";

export function CreatePlayerForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kit, setKit] = useState<KitKey>("neutral");
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
    <form action={action} className="space-y-5">
      <div className="flex justify-center rounded-2xl bg-gradient-to-b from-primary/15 to-transparent py-4">
        <PlayerShirt name={name || "Player"} kitKey={kit} size="xl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-displayName">Display name</Label>
        <Input
          id="create-displayName"
          name="displayName"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-kitKey">Shirt</Label>
        <KitPicker
          value={kit}
          onChange={setKit}
          playerName={name || "Player"}
          disabled={pending}
        />
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
