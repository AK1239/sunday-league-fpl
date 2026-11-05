"use client";

import { useActionState } from "react";
import { completeJoinAndSignInAction } from "@/server/actions/manager-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/actions/action-result";
import type { InvitePreview } from "@/server/domain/invites";

async function joinStateAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return completeJoinAndSignInAction(formData);
}

export function JoinForm({
  token,
  preview,
}: {
  token: string;
  preview: InvitePreview;
}) {
  const [state, formAction, pending] = useActionState(joinStateAction, null);
  const isReset = preview.isPasswordReset;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-4"
    >
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          readOnly={isReset && Boolean(preview.resetEmail)}
          defaultValue={preview.resetEmail ?? ""}
          disabled={pending}
        />
      </div>
      {!isReset ? (
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            required
            defaultValue={preview.label ?? ""}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Shown on the manager leaderboard.
          </p>
        </div>
      ) : (
        <input type="hidden" name="displayName" value="" />
      )}
      <div className="space-y-2">
        <Label htmlFor="password">
          {isReset ? "New password" : "Password"}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Saving…"
          : isReset
            ? "Update password"
            : "Create account"}
      </Button>
    </form>
  );
}
