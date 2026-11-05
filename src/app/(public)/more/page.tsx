import Link from "next/link";
import { LEAGUE_NAME } from "@/lib/league";

export default function MorePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight">More</h1>
        <p className="mt-1 text-sm text-muted-foreground">{LEAGUE_NAME}</p>
      </header>
      <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/70">
        <MoreLink href="/table" label="Full standings" />
        <MoreLink href="/matchdays" label="Matchdays" />
        <MoreLink href="/awards" label="Awards" />
      </ul>
      <p className="text-xs text-muted-foreground">
        Scoring rules and season archive will be added in upcoming phases.
      </p>
    </div>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-12 items-center px-4 py-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {label}
      </Link>
    </li>
  );
}
