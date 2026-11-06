"use client";

import { useActionState } from "react";
import { completeJoinAndSignInAction } from "@/server/actions/manager-auth";
import { Lock, Mail, User } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
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
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        icon={<Mail />}
        placeholder="you@example.com"
        required
        readOnly={isReset && Boolean(preview.resetEmail)}
        defaultValue={preview.resetEmail ?? ""}
        disabled={pending}
      />
      {!isReset ? (
        <FormField
          label="Display name"
          name="displayName"
          autoComplete="nickname"
          icon={<User />}
          placeholder="e.g. Captain Mkate"
          required
          defaultValue={preview.label ?? ""}
          hint={
            preview.isReusable
              ? "Shown on the manager leaderboard. Ask the admin if you need your player profile linked after signing up."
              : "Shown on the manager leaderboard."
          }
          disabled={pending}
        />
      ) : (
        <input type="hidden" name="displayName" value="" />
      )}
      <FormField
        label={isReset ? "New password" : "Password"}
        name="password"
        type="password"
        autoComplete="new-password"
        icon={<Lock />}
        minLength={8}
        required
        hint="At least 8 characters."
        disabled={pending}
      />
      {state?.ok === false ? <FormError message={state.message} /> : null}
      <SubmitButton
        pending={pending}
        idle={isReset ? "Update password" : "Create account"}
        busy="Saving…"
      />
    </form>
  );
}
