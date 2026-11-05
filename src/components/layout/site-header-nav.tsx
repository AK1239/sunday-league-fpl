"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const SITE_NAV = [
  { href: "/", label: "Home" },
  { href: "/table", label: "Table" },
  { href: "/matchdays", label: "Matchdays" },
  { href: "/players", label: "Players" },
  { href: "/awards", label: "Awards" },
] as const;

export function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/my") {
    return pathname === "/my" || pathname.startsWith("/my/");
  }
  if (href === "/pick") {
    return pathname === "/pick" || pathname.startsWith("/pick/");
  }
  return pathname.startsWith(href);
}

export function SiteHeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {SITE_NAV.map((item) => {
        const active = navActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300",
              active
                ? "text-foreground after:scale-x-100"
                : "text-muted-foreground hover:text-foreground hover:after:scale-x-50 hover:after:bg-foreground/30",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
