import { Award, CalendarDays, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/fantasy/page-header";
import { LEAGUE_NAME } from "@/lib/league";

export default function MorePage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={LEAGUE_NAME} title="More" />
      <ul className="space-y-3">
        <MoreLink
          href="/table"
          label="Full standings"
          icon={<Trophy />}
          i={0}
        />
        <MoreLink
          href="/matchdays"
          label="Matchdays"
          icon={<CalendarDays />}
          i={1}
        />
        <MoreLink href="/awards" label="Awards" icon={<Award />} i={2} />
      </ul>
      <p className="text-xs text-muted-foreground">
        Scoring rules and season archive will be added in upcoming phases.
      </p>
    </div>
  );
}

function MoreLink({
  href,
  label,
  icon,
  i,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
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
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </span>
        <span className="flex-1">{label}</span>
        <ChevronRight
          className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
          aria-hidden
        />
      </Link>
    </li>
  );
}
