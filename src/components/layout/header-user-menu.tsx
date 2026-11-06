"use client";

import { ChevronDown, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { managerLogoutAction } from "@/server/actions/manager-auth";
import { cn } from "@/lib/utils";

export function HeaderUserMenu({
  displayName,
  isAdmin = false,
}: {
  displayName: string;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:bg-muted hover:bg-muted";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        className="flex items-center gap-1.5 rounded-full border border-border/60 py-1 pr-2 pl-1 transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PlayerAvatar name={displayName} size="sm" />
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="glass animate-pop absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl bg-popover/95 p-1.5"
        >
          <div className="px-3 pt-2 pb-2.5">
            <p className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Signed in as
            </p>
            <p className="truncate font-medium">{displayName}</p>
          </div>
          <div className="my-1 h-px bg-border/60" />
          {isAdmin ? (
            <Link
              href="/admin"
              role="menuitem"
              className={item}
              onClick={() => setOpen(false)}
            >
              <Shield className="size-4 text-primary" aria-hidden />
              Admin
            </Link>
          ) : null}
          <form action={managerLogoutAction}>
            <button
              type="submit"
              role="menuitem"
              className={cn(item, "text-destructive")}
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
