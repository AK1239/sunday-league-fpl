import { Suspense } from "react";
import { AdminMatchdayInspectorPanel } from "@/components/admin/admin-matchday-inspector-panel";

export default function MatchdayInspectorPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Loading scoring inspector…
        </p>
      }
    >
      <AdminMatchdayInspectorPanelWrapper params={params} />
    </Suspense>
  );
}

async function AdminMatchdayInspectorPanelWrapper({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return <AdminMatchdayInspectorPanel matchdayId={matchdayId} />;
}
