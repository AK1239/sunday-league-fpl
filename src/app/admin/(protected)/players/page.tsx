import { Suspense } from "react";
import { AdminPlayersList } from "@/components/admin/admin-players-list";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPlayersToolbar } from "@/components/admin/admin-players-toolbar";

export default function AdminPlayersPage() {
  return (
    <div className="space-y-8">
      <AdminPlayersToolbar />

      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2" role="status">
            <span className="sr-only">Loading squad</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        }
      >
        <AdminPlayersList />
      </Suspense>
    </div>
  );
}
