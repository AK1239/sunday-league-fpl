"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const CLOSE_MS = 200;

/**
 * Right-hand drawer built on a native <dialog> (focus trap, Esc, inert page).
 * Full-screen on phones, a 26rem panel from `sm` up. Slides in/out, closes on
 * backdrop tap, Esc, the close button, or a swipe to the right.
 *
 * `toolbar` stays pinned under the header while `children` scroll.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  leading,
  toolbar,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  leading?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "";
      };
    }

    if (!dialog.open) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      dialog.close();
      return;
    }
    dialog.setAttribute("data-closing", "");
    const t = window.setTimeout(() => {
      dialog.removeAttribute("data-closing");
      dialog.close();
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-drawer
      aria-label={title}
      className={cn(
        "glass fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-background/95 p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        "sm:w-[26rem] sm:rounded-l-3xl",
        className,
      )}
      // Esc: let our own close animation run instead of the instant native close.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        // Native close (e.g. form method=dialog) — keep parent state in sync.
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-swipe]")) {
          touch.current = null;
          return;
        }
        const t = e.touches[0]!;
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const t = e.changedTouches[0]!;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (dx > 90 && dx > Math.abs(dy) * 1.8) onClose();
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-border/50 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-5 sm:pt-5">
          {leading}
          <div className="min-w-0 flex-1">
            <h2 className="font-heading truncate text-2xl leading-tight font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="truncate text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-95 sm:size-10"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {toolbar ? (
          <div className="shrink-0 space-y-3 border-b border-border/40 px-4 py-3 sm:px-5">
            {toolbar}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
