"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  LineChart,
  MoreHorizontal,
  Shirt,
  Trophy,
} from "lucide-react";
import { PRIMARY_SITE_NAV, navActive } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

const ICONS = {
  "/": Home,
  "/my": LayoutDashboard,
  "/my/points": LineChart,
  "/pick": Shirt,
  "/table": Trophy,
  "/more": MoreHorizontal,
} as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-3 bottom-3 z-40 rounded-2xl pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg">
        {PRIMARY_SITE_NAV.map((item) => {
          const Icon = ICONS[item.href as keyof typeof ICONS];
          const active = navActive(pathname, item);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-95",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="animate-pop absolute top-1.5 h-0.5 w-6 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
                  />
                ) : null}
                <Icon
                  className="mt-1 size-5 shrink-0"
                  aria-hidden
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
