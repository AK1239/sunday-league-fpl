import { connection } from "next/server";
import { notFound } from "next/navigation";
import { MatchdayEntryClient } from "@/components/admin/matchday-entry-client";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { loadMatchdayEntry } from "@/server/domain/match-entry";

export async function AdminMatchdayEntryPanel({
  matchdayId,
}: {
  matchdayId: string;
}) {
  await connection();
  await requireAdmin();

  const entry = await loadMatchdayEntry(getDb(), matchdayId);
  if (!entry) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Gameweek ${entry.number}`}
        title="Match entry"
        description={`${entry.playedOn} · ${entry.status} — autosave; publish when results are final.`}
      />
      <MatchdayEntryClient initial={entry} />
    </div>
  );
}
