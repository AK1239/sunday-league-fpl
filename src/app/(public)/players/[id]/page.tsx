import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerProfilePanel } from "@/components/public/player-profile-panel";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PlayerProfileSkeleton />}>
      <PlayerProfilePanelWrapper params={params} />
    </Suspense>
  );
}

async function PlayerProfilePanelWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerProfilePanel playerId={id} />;
}

function PlayerProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading profile</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
