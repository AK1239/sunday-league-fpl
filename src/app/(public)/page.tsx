import { Suspense } from "react";
import { HomeHubPanel } from "@/components/public/home-hub-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" role="status">
          <Skeleton className="h-16 w-3/4 rounded-xl" />
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      }
    >
      <HomeHubPanel />
    </Suspense>
  );
}
