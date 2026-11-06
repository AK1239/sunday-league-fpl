"use client";

import { useState, useTransition } from "react";
import { toastActionResult } from "@/lib/app-toast";
import { closeSeasonAction } from "@/server/actions/seasons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CloseSeasonButton({ seasonId }: { seasonId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        {pending ? "Closing…" : "Close season"}
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Close this season?"
        description="Awards will be recorded and the season will be frozen. Activate another season when ready."
        confirmLabel="Close season"
        destructive
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          startTransition(async () => {
            const result = await closeSeasonAction(seasonId);
            setConfirming(false);
            toastActionResult(result, "Season closed");
          })
        }
      />
    </>
  );
}
