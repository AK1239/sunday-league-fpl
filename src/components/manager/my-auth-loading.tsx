import { Skeleton } from "@/components/ui/skeleton";

export function MyAuthLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" role="status" aria-busy="true">
      <span className="sr-only">Loading your league…</span>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
