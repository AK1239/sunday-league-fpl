"use client";

import { Lock, Mail } from "lucide-react";
import { useActionState } from "react";
import { FormError } from "@/components/auth/form-error";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { managerLoginAction } from "@/server/actions/manager-auth";
import type { ActionResult } from "@/server/actions/action-result";

async function loginStateAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return managerLoginAction(formData);
}

export function ManagerLoginForm() {
  const [state, formAction, pending] = useActionState(loginStateAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="username"
        icon={<Mail />}
        required
        disabled={pending}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        icon={<Lock />}
        required
        disabled={pending}
      />
      {state?.ok === false ? <FormError message={state.message} /> : null}
      <SubmitButton pending={pending} idle="Sign in" busy="Signing in…" />
    </form>
  );
}
