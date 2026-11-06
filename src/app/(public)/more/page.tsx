import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/fantasy/page-header";
import { LEAGUE_NAME } from "@/lib/league";
import { MORE_SITE_NAV } from "@/lib/site-nav";

export default function MorePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={LEAGUE_NAME}
        title="More"
        description="Matchdays, standings, awards, and the rest of the league."
      />
      <ul className="space-y-3">
        {MORE_SITE_NAV.map((item, i) => (
          <MoreLink key={item.href} href={item.href} label={item.label} i={i} />
        ))}
      </ul>
    </div>
  );
}

function MoreLink({
  href,
  label,
  i,
}: {
  href: string;
  label: string;
  i: number;
}) {
  return (
    <li
      className="animate-rise"
      style={{ "--d": `${100 + i * 70}ms` } as React.CSSProperties}
    >
      <Link
        href={href}
        className="group surface surface-hover flex min-h-14 items-center gap-4 rounded-2xl px-4 py-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex-1">{label}</span>
        <ChevronRight
          className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
          aria-hidden
        />
      </Link>
    </li>
  );
}
