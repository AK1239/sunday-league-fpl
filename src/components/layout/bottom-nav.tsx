"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  CalendarDays,
  Home,
  MoreHorizontal,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/table", label: "Table", icon: Trophy },
  { href: "/matchdays", label: "Days", icon: CalendarDays },
  { href: "/awards", label: "Awards", icon: Award },
  { href: "/more", label: "More", icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
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
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="size-5"
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
