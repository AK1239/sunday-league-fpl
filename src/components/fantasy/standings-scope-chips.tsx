"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Scope = "season" | "all-time";

export function StandingsScopeChips({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope: Scope =
    searchParams.get("scope") === "all-time" ? "all-time" : "season";

  if (pathname !== basePath) return null;

  function hrefFor(next: Scope) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all-time") {
      params.set("scope", "all-time");
    } else {
      params.delete("scope");
    }
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  }

  return (
    <div
      className="flex gap-2"
      role="group"
      aria-label="Standings scope"
    >
      {(
        [
          ["season", "This season"],
          ["all-time", "All-time"],
        ] as const
      ).map(([value, label]) => (
        <Link
          key={value}
          href={hrefFor(value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            scope === value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
          aria-current={scope === value ? "true" : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
