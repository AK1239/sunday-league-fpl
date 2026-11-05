"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { StandingSort } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

const OPTIONS: { value: StandingSort; label: string }[] = [
  { value: "points", label: "Points" },
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "appearances", label: "Apps" },
  { value: "average", label: "Avg" },
];

export function StandingsSortChips() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("sort") as StandingSort | null) ?? "points";

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Sort standings"
    >
      {OPTIONS.map((option) => {
        const active = current === option.value;
        const params = new URLSearchParams(searchParams.toString());
        if (option.value === "points") params.delete("sort");
        else params.set("sort", option.value);
        const href = params.size ? `${pathname}?${params}` : pathname;

        return (
          <Link
            key={option.value}
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary/40 bg-primary text-primary-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
