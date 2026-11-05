import { Suspense } from "react";
import { AdminMatchdaysPanel } from "@/components/admin/admin-matchdays-panel";
import { PageHeader } from "@/components/fantasy/page-header";

export default function AdminMatchdaysPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Matchdays"
        description="Schedule Sundays, set selection deadlines, postpone or cancel gameweeks."
      />

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" role="status">
            Loading matchdays…
          </p>
        }
      >
        <AdminMatchdaysPanel />
      </Suspense>
    </div>
  );
}
