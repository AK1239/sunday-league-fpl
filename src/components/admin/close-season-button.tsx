"use client";

import { useTransition } from "react";
import { toastActionResult } from "@/lib/app-toast";
import { closeSeasonAction } from "@/server/actions/seasons";
import { Button } from "@/components/ui/button";

export function CloseSeasonButton({ seasonId }: { seasonId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Close this season? Awards will be recorded and the season will be frozen. Activate another season when ready.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await closeSeasonAction(seasonId);
          toastActionResult(result, "Season closed");
        });
      }}
    >
      {pending ? "Closing…" : "Close season"}
    </Button>
  );
}
