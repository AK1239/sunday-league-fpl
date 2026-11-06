"use client";

import { useTransition } from "react";
import { toastActionResult } from "@/lib/app-toast";
import { activateSeasonAction } from "@/server/actions/seasons";
import { Button } from "@/components/ui/button";

export function ActivateSeasonButton({
  seasonId,
  disabled,
}: {
  seasonId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await activateSeasonAction(seasonId);
          toastActionResult(result, "Season activated");
        })
      }
    >
      {pending ? "Activating…" : "Set active"}
    </Button>
  );
}
