import { MyPagesShell } from "@/components/manager/my-pages-shell";
import { MyPointsPanel } from "@/components/manager/my-points-panel";

export default function MyPointsGameweekPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  return (
    <MyPagesShell>
      <MyPointsGameweek params={params} />
    </MyPagesShell>
  );
}

async function MyPointsGameweek({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return <MyPointsPanel matchdayId={matchdayId} />;
}
