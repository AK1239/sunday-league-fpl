"use client";

import { useTransition } from "react";
import { toastActionResult } from "@/lib/app-toast";
import { enableSeasonChipsAction } from "@/server/actions/seasons";
import { Button } from "@/components/ui/button";

export function EnableSeasonChipsButton({
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
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const fd = new FormData();
          fd.set("seasonId", seasonId);
          const result = await enableSeasonChipsAction(fd);
          toastActionResult(result, "Chips enabled for season");
        })
      }
    >
      {pending ? "Enabling…" : "Enable chips"}
    </Button>
  );
}
