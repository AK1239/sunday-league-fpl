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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-muted-foreground" aria-hidden>
          {icon}
        </div>
      ) : null}
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
