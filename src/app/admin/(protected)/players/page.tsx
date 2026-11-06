import { Suspense } from "react";
import { AdminPlayersList } from "@/components/admin/admin-players-list";
import { AdminPlayersToolbar } from "@/components/admin/admin-players-toolbar";

export default function AdminPlayersPage() {
  return (
    <div className="space-y-8">
      <AdminPlayersToolbar />

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" role="status">
            Loading squad…
          </p>
        }
      >
        <AdminPlayersList />
      </Suspense>
    </div>
  );
}
