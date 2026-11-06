"use client";

import { useEffect, useRef } from "react";
import type { ActionResult } from "@/server/actions/action-result";
import { appToast } from "@/lib/app-toast";

/** Show success/error toasts when a `useActionState` result changes. */
export function useActionResultToast(
  state: ActionResult | null,
  successMessage: string,
) {
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!state) return;
    const fingerprint = JSON.stringify(state);
    if (fingerprint === seen.current) return;
    seen.current = fingerprint;

    if (state.ok) {
      appToast.success(successMessage);
    } else {
      appToast.error(state.message);
    }
  }, [state, successMessage]);
}
