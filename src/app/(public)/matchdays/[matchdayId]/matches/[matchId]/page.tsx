import { Suspense } from "react";
import { MatchDetailPanel } from "@/components/public/match-detail-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchdayId: string; matchId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      }
    >
      <MatchDetailPanelWrapper params={params} />
    </Suspense>
  );
}

async function MatchDetailPanelWrapper({
  params,
}: {
  params: Promise<{ matchdayId: string; matchId: string }>;
}) {
  const { matchId } = await params;
  return <MatchDetailPanel matchId={matchId} />;
}
