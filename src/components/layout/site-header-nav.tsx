"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_SITE_NAV, navActive } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

export function SiteHeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
      {PRIMARY_SITE_NAV.map((item) => {
        const active = navActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring xl:px-3",
              "after:absolute after:inset-x-2 after:-bottom-[13px] after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 xl:after:inset-x-3",
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
