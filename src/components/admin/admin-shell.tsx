import Link from "next/link";
import { AdminHeaderUserMenu } from "@/components/admin/admin-header-user-menu";
import { LEAGUE_NAME } from "@/lib/league";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/matchdays", label: "Matchdays" },
  { href: "/admin/transfers", label: "Transfers" },
  { href: "/admin/chips", label: "Chips" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/invites", label: "Invites" },
] as const;

export function AdminShell({
  email,
  displayName,
  children,
}: {
  email: string;
  displayName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <Link
            href="/admin"
            className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Admin
            </p>
            <p className="font-heading text-sm font-semibold">{LEAGUE_NAME}</p>
          </Link>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <nav
              className="flex max-w-full flex-wrap justify-end gap-0.5 sm:gap-1"
              aria-label="Admin"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <AdminHeaderUserMenu displayName={displayName} email={email} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
