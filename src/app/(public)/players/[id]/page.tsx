import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerProfileView } from "@/components/fantasy/player-profile-view";
import { MOCK_PLAYERS } from "@/lib/mock/data";

export function generateStaticParams() {
  return MOCK_PLAYERS.map((player) => ({ id: player.id }));
}

export default function PlayerProfilePage({
  params,
}: PageProps<"/players/[id]">) {
  return (
    <Suspense fallback={<PlayerProfileSkeleton />}>
      <PlayerProfileView params={params} />
    </Suspense>
  );
}

function PlayerProfileSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading profile</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
