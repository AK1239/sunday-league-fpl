import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { MatchdayInspectorClient } from "@/components/admin/matchday-inspector-client";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { loadScoringInspector } from "@/server/domain/scoring-inspector";

export async function AdminMatchdayInspectorPanel({
  matchdayId,
}: {
  matchdayId: string;
}) {
  await connection();
  await requireAdmin();

  const data = await loadScoringInspector(getDb(), matchdayId);
  if (!data) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Gameweek ${data.number}`}
        title="Scoring inspector"
        description={`${data.playedOn} · ${data.status} — player ledger and manager score lines.`}
      />
      <Link
        href={`/admin/matchdays/${matchdayId}/entry`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Match entry
      </Link>
      <MatchdayInspectorClient initial={data} />
    </div>
  );
}
