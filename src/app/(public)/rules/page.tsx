import { Suspense } from "react";
import { RulesPanel } from "@/components/public/rules-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function RulesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status">
          <Skeleton className="h-12 w-1/2 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      }
    >
      <RulesPanel />
    </Suspense>
  );
}
