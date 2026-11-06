import { Suspense } from "react";
import { AdminActivityPanel } from "@/components/admin/admin-activity-panel";

export default function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    surface?: string;
    actions?: string;
    page?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Loading activity…
        </p>
      }
    >
      <AdminActivityPanel searchParams={searchParams} />
    </Suspense>
  );
}
