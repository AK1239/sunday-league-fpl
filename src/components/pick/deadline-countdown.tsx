"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Deadline passed";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function DeadlineCountdown({
  deadlineAtIso,
  serverNowIso,
  className,
}: {
  deadlineAtIso: string;
  serverNowIso: string;
  className?: string;
}) {
  const skewMs = useMemo(
    () => Date.now() - new Date(serverNowIso).getTime(),
    [serverNowIso],
  );
  const deadlineMs = useMemo(
    () => new Date(deadlineAtIso).getTime(),
    [deadlineAtIso],
  );

  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, deadlineMs - (Date.now() - skewMs)),
  );

  useEffect(() => {
    const tick = () => {
      setRemainingMs(Math.max(0, deadlineMs - (Date.now() - skewMs)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs, skewMs]);

  const label = formatRemaining(remainingMs);

  return (
    <p
      className={cn(
        "font-mono text-sm tabular-nums tracking-tight",
        remainingMs <= 0 ? "text-destructive" : "text-primary",
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      {label}
    </p>
  );
}
