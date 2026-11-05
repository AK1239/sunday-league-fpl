import { Skeleton } from "@/components/ui/skeleton";

export function PickTeamSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading pick team">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="mx-auto aspect-[4/5] max-w-sm rounded-3xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
