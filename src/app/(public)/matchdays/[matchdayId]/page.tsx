import { Suspense } from "react";
import { MatchdayDetailPanel } from "@/components/public/matchday-detail-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchdayDetailPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      }
    >
      <MatchdayDetailPanelWrapper params={params} />
    </Suspense>
  );
}

async function MatchdayDetailPanelWrapper({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return <MatchdayDetailPanel matchdayId={matchdayId} />;
}
