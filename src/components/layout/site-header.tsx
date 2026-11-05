import { Shirt } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LEAGUE_NAME, LEAGUE_SHORT } from "@/lib/league";
import { SiteHeaderNav } from "./site-header-nav";
import { SiteHeaderUser } from "./site-header-user";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link
          href="/"
          className="group/logo flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="glow-primary flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-transform duration-300 group-hover/logo:rotate-[-6deg] group-hover/logo:scale-105">
            {LEAGUE_SHORT}
          </span>
          <span className="hidden font-heading text-sm font-semibold tracking-tight sm:inline">
            {LEAGUE_NAME}
          </span>
        </Link>
        <div className="flex flex-1 justify-center">
          <SiteHeaderNav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/pick"
            className="glow-primary hidden items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-all outline-none hover:-translate-y-px hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline-flex"
          >
            <Shirt className="size-4" aria-hidden />
            Pick team
          </Link>
          <ThemeToggle />
          <Suspense
            fallback={
              <span className="inline-block size-10 animate-pulse rounded-full bg-muted" />
            }
          >
            <SiteHeaderUser />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
