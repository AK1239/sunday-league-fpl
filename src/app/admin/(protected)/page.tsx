import Link from "next/link";
import { Card } from "@/components/ui/card";
export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <header className="animate-rise space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Admin
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Schedule gameweeks, manage the squad, and invite managers.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        <AdminLinkCard
          href="/admin/matchdays"
          title="Matchdays"
          description="Schedule Sundays, deadlines, postpone or cancel."
        />
        <AdminLinkCard
          href="/admin/settings"
          title="League settings"
          description="Timezone, kickoff, and default deadline offset."
        />
        <AdminLinkCard
          href="/admin/players"
          title="Players"
          description="Add, edit, and deactivate squad members."
        />
        <AdminLinkCard
          href="/admin/seasons"
          title="Seasons"
          description="Create seasons and set which one is active."
        />
        <AdminLinkCard
          href="/admin/invites"
          title="Invites"
          description="One-time links for managers to join."
        />
      </ul>
    </div>
  );
}

function AdminLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link href={href} className="block h-full">
        <Card className="surface-hover h-full p-5">
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </Card>
      </Link>
    </li>
  );
}
