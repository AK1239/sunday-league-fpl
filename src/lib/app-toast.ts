import { toast } from "sonner";
import type { ActionResult } from "@/server/actions/action-result";

export const AUTOSAVE_TOAST_ID = "matchday-autosave";

export const appToast = {
  success(message: string, options?: { id?: string; description?: string }) {
    toast.success(message, {
      id: options?.id,
      description: options?.description,
      duration: 3200,
    });
  },
  error(message: string, options?: { description?: string }) {
    toast.error(message, {
      description: options?.description,
      duration: 5200,
    });
  },
  /** Updates a single toast instead of stacking on rapid autosaves. */
  autosaved(message: string) {
    toast.success(message, {
      id: AUTOSAVE_TOAST_ID,
      duration: 1800,
    });
  },
};

export function toastActionResult<T>(
  result: ActionResult<T>,
  successMessage: string,
): result is { ok: true; data: T } {
  if (result.ok) {
    appToast.success(successMessage);
    return true;
  }
  appToast.error(result.message);
  return false;
}
