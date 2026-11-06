import { Suspense } from "react";
import { AdminTransfersPanel } from "@/components/admin/admin-transfers-panel";

export default function AdminTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{
    matchdayId?: string;
    penalised?: string;
    managerId?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Loading transfers…
        </p>
      }
    >
      <AdminTransfersPanel searchParams={searchParams} />
    </Suspense>
  );
}
