import { MyPagesShell } from "@/components/manager/my-pages-shell";
import { MyPointsDetailPanel } from "@/components/manager/my-points-detail-panel";

export default function MyPointsDetailPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  return (
    <MyPagesShell>
      <MyPointsDetailPanelRoute params={params} />
    </MyPagesShell>
  );
}

async function MyPointsDetailPanelRoute({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return <MyPointsDetailPanel matchdayId={matchdayId} />;
}
