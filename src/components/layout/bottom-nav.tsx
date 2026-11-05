"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  MoreHorizontal,
  Shirt,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/table", label: "Table", icon: Trophy },
  { href: "/matchdays", label: "Days", icon: CalendarDays },
  { href: "/pick", label: "Pick", icon: Shirt },
  { href: "/more", label: "More", icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-3 bottom-3 z-40 rounded-2xl pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/more"
                ? pathname === "/more"
                : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-95",
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
                  className="mt-1 size-5"
                  aria-hidden
                  strokeWidth={active ? 2.5 : 2}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
