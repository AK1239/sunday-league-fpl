"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AddPlayerModal } from "@/components/admin/add-player-modal";
import { Button } from "@/components/ui/button";

export function AdminPlayersToolbar() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Players
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the squad and upload avatars.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" aria-hidden />
          Add player
        </Button>
      </header>
      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
