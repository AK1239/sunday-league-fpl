import Link from "next/link";
import { Card } from "@/components/ui/card";
export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage squad, seasons, and matchdays (match entry comes next).
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
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
        <Card className="h-full p-4 transition-colors hover:bg-muted/40">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </Card>
      </Link>
    </li>
  );
}
