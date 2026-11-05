import { Suspense } from "react";
import { MatchdaysListPanel } from "@/components/public/matchdays-list-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchdaysPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status">
          <Skeleton className="h-12 w-1/2 rounded-xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      }
    >
      <MatchdaysListPanel />
    </Suspense>
  );
}
