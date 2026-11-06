"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOLD_MS = 1000;

export function HoldToConfirmButton({
  label,
  confirming,
  onConfirm,
  className,
}: {
  label: string;
  confirming?: boolean;
  onConfirm: () => void;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    start.current = null;
    setProgress(0);
  }, []);

  const onPointerDown = () => {
    if (confirming) return;
    start.current = Date.now();
    timer.current = setInterval(() => {
      const elapsed = Date.now() - (start.current ?? Date.now());
      const p = Math.min(1, elapsed / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clear();
        onConfirm();
      }
    }, 50);
  };

  return (
    <Button
      type="button"
      className={cn("relative w-full overflow-hidden", className)}
      disabled={confirming}
      onPointerDown={onPointerDown}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
    >
      <span
        className="absolute inset-y-0 left-0 bg-primary-foreground/20 transition-[width]"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />
      <span className="relative">
        {confirming ? "Saving…" : progress > 0 ? "Keep holding…" : label}
      </span>
    </Button>
  );
}
