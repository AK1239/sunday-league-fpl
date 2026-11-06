import { Suspense } from "react";
import { AdminChipsPanel } from "@/components/admin/admin-chips-panel";

export default function AdminChipsPage({
  searchParams,
}: {
  searchParams: Promise<{
    chipCode?: string;
    matchdayId?: string;
    managerId?: string;
    status?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Loading chips…
        </p>
      }
    >
      <AdminChipsPanel searchParams={searchParams} />
    </Suspense>
  );
}
