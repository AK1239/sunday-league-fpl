"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 m-0 max-h-[85dvh] w-full max-w-none translate-y-0 rounded-t-3xl border border-border/60 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 open:animate-in open:slide-in-from-bottom",
        className,
      )}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {title}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </dialog>
  );
}
