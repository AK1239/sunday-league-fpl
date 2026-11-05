"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEAGUE_NAME, LEAGUE_SHORT } from "@/lib/league";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/table", label: "Table" },
  { href: "/matchdays", label: "Matchdays" },
  { href: "/awards", label: "Awards" },
  { href: "/pick", label: "Pick Team" },
  { href: "/my", label: "My" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="group/logo flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="glow-primary flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-transform duration-300 group-hover/logo:rotate-[-6deg] group-hover/logo:scale-105">
            {LEAGUE_SHORT}
          </span>
          <span className="hidden font-heading text-sm font-semibold tracking-tight sm:inline">
            {LEAGUE_NAME}
          </span>
        </Link>
        <nav
          className="hidden items-center gap-1 rounded-full border border-border/50 bg-card/50 p-1 md:flex"
          aria-label="Main"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Log in
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
