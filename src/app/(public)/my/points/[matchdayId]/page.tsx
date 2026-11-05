import { MyPagesShell } from "@/components/manager/my-pages-shell";
import { MyPointsDetailPanel } from "@/components/manager/my-points-detail-panel";

export default async function MyPointsDetailPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return (
    <MyPagesShell>
      <MyPointsDetailPanel matchdayId={matchdayId} />
    </MyPagesShell>
  );
}
