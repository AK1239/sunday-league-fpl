"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AddPlayerModal } from "@/components/admin/add-player-modal";
import { adminActionButtonClassName } from "@/components/admin/admin-action-link";
import { cn } from "@/lib/utils";

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
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cn(adminActionButtonClassName)}
        >
          <UserPlus className="size-4" aria-hidden />
          Add player
        </button>
      </header>
      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
