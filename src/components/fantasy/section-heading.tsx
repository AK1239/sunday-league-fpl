import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <h2 className="font-heading flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl">
        <span aria-hidden className="h-5 w-1 rounded-full bg-primary" />
        {title}
      </h2>
      {action}
    </div>
  );
}
