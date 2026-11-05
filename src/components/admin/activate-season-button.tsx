"use client";

import { useTransition } from "react";
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
          await activateSeasonAction(seasonId);
        })
      }
    >
      {pending ? "Activating…" : "Set active"}
    </Button>
  );
}
