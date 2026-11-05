"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on mobile, centred modal from `sm` up.
 * NB: `top-auto` is required — a <dialog> has a UA `inset-block-start: 0`
 * that otherwise pins it to the top of the viewport.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  leading,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  leading?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      data-sheet
      className={cn(
        "glass fixed inset-x-0 top-auto bottom-0 z-50 m-0 max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-[1.75rem] bg-background/95 p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        "sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md sm:rounded-3xl",
        className,
      )}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div
          aria-hidden
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20 sm:hidden"
        />
        <div className="flex items-center gap-3 px-5 pt-3 pb-3 sm:pt-5">
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
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
