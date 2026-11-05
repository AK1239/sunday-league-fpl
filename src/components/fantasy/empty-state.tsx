import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-rise relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute top-0 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      {icon ? (
        <div
          className="animate-pop relative mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary [&_svg]:size-8"
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h2 className="font-heading relative text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="relative mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="relative mt-6">{action}</div> : null}
    </div>
  );
}
