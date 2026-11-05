"use client";

import { useActionState } from "react";
import { managerLoginAction } from "@/server/actions/manager-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
