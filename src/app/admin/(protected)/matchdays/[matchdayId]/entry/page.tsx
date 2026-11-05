import { Suspense } from "react";
import { AdminMatchdayEntryPanel } from "@/components/admin/admin-matchday-entry-panel";

export default function MatchdayEntryPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Loading match entry…
        </p>
      }
    >
      <AdminMatchdayEntryPanelWrapper params={params} />
    </Suspense>
  );
}

async function AdminMatchdayEntryPanelWrapper({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return <AdminMatchdayEntryPanel matchdayId={matchdayId} />;
}
