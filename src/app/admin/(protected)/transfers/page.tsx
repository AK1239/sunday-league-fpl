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
  return <AdminTransfersPanel searchParams={searchParams} />;
}
