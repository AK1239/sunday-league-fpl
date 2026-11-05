import { Skeleton } from "@/components/ui/skeleton";

export function MyAuthLoading() {
  return (
    <div className="min-h-full" role="status" aria-busy="true">
      <span className="sr-only">Loading your league…</span>
      <div className="border-b border-border/40 px-4 py-4">
        <Skeleton className="mx-auto h-10 max-w-3xl rounded-xl" />
      </div>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
