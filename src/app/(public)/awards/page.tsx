import { Suspense } from "react";
import { AwardsPanel } from "@/components/public/awards-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function AwardsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status">
          <Skeleton className="h-12 w-2/3 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      }
    >
      <AwardsPanel />
    </Suspense>
  );
}
