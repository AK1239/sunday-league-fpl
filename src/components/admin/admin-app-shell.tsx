"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminHeaderUserMenu } from "@/components/admin/admin-header-user-menu";
import {
  AdminSidebarNav,
  AdminMobileNavToggle,
} from "@/components/admin/admin-sidebar";
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
        <aside className="hidden w-56 shrink-0 border-r border-border/40 bg-background/90 py-6 pr-3 pl-4 backdrop-blur-sm md:block">
          <AdminSidebarNav />
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
            <div className="flex items-center gap-3 px-4 py-3">
              <AdminMobileNavToggle
                open={mobileNavOpen}
                onToggle={() => setMobileNavOpen((v) => !v)}
              />
              <Link
                href="/admin"
                className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-initial"
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary uppercase md:hidden">
                  Admin
                </p>
                <p className="truncate font-heading text-base font-semibold md:text-sm">
                  {LEAGUE_NAME}
                </p>
              </Link>
              <div className="hidden md:block">
                <p className="text-xs text-muted-foreground">
                  League administration
                </p>
              </div>
              <AdminHeaderUserMenu displayName={displayName} email={email} />
            </div>
          </header>

          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 xl:max-w-4xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
