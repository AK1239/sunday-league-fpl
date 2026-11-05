"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Lock, Mail } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { ActionResult } from "@/server/actions/action-result";

async function loginStateAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return loginAction(formData);
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginStateAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        icon={<Mail />}
        required
        disabled={pending}
        error={state?.ok === false ? state.fieldErrors?.email : undefined}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        icon={<Lock />}
        required
        disabled={pending}
        error={state?.ok === false ? state.fieldErrors?.password : undefined}
      />
      {state?.ok === false && !state.fieldErrors ? (
        <FormError message={state.message} />
      ) : null}
      <SubmitButton pending={pending} idle="Sign in" busy="Signing in…" />
    </form>
  );
}
