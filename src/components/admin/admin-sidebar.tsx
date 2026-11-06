"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function navLinkClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-primary/15 text-primary"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );
}

export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6" aria-label="Admin sections">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={navLinkClass(active)}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminMobileNavToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="md:hidden"
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      onClick={onToggle}
    >
      {open ? <X className="size-5" /> : <Menu className="size-5" />}
    </Button>
  );
}
