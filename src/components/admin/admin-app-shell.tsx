"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AdminHeaderUserMenu } from "@/components/admin/admin-header-user-menu";
import {
  AdminSidebarNav,
  AdminMobileNavToggle,
} from "@/components/admin/admin-sidebar";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { LEAGUE_NAME } from "@/lib/league";
import { cn } from "@/lib/utils";

export function AdminAppShell({
  email,
  displayName,
  children,
}: {
  email: string;
  displayName: string;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Current section title for the header (longest matching nav href wins).
  const section =
    ADMIN_NAV_GROUPS.flatMap((group) => group.items)
      .filter((item) =>
        item.href === "/admin"
          ? pathname === "/admin"
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Dashboard";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer after client navigates (Next.js RSC)
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-full bg-background">
      <div className="flex min-h-full">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border/40 bg-background/90 backdrop-blur-sm md:flex">
          {/* Brand block: same height as the top header so the two line up. */}
          <Link
            href="/admin"
            className="flex h-16 shrink-0 flex-col justify-center border-b border-border/40 px-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Admin
            </p>
            <p className="truncate font-heading text-base leading-tight font-semibold">
              {LEAGUE_NAME}
            </p>
          </Link>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <AdminSidebarNav />
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        {/* Mobile drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] border-r border-border/40 bg-background p-4 shadow-xl transition-transform duration-200 ease-out md:hidden",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-hidden={!mobileNavOpen}
        >
          <div className="mb-6">
            <Link
              href="/admin"
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMobileNavOpen(false)}
            >
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary uppercase">
                Admin
              </p>
              <p className="font-heading text-sm font-semibold">
                {LEAGUE_NAME}
              </p>
            </Link>
          </div>
          <AdminSidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </aside>

        <div className="flex min-h-full min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
            <div className="flex h-16 items-center gap-3 px-4 md:px-8">
              <AdminMobileNavToggle
                open={mobileNavOpen}
                onToggle={() => setMobileNavOpen((v) => !v)}
              />
              {/* Mobile: brand (the sidebar is a drawer there). */}
              <Link
                href="/admin"
                className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary uppercase">
                  Admin
                </p>
                <p className="truncate font-heading text-base leading-tight font-semibold">
                  {LEAGUE_NAME}
                </p>
              </Link>
              {/* Desktop: where you are. */}
              <div className="hidden min-w-0 md:block">
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  League administration
                </p>
                <p className="truncate font-heading text-lg leading-tight font-semibold">
                  {section}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <Link
                  href="/"
                  className="hidden items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                >
                  View site
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
                <AdminHeaderUserMenu displayName={displayName} email={email} />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8 xl:max-w-5xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
