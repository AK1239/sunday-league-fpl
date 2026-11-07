import { MyPagesShell } from "@/components/manager/my-pages-shell";
import { MyHistoryPanel } from "@/components/manager/my-history-panel";

export default function MyHistoryGameweekPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  return (
    <MyPagesShell>
      <MyHistoryGameweek params={params} />
    </MyPagesShell>
  );
}

async function MyHistoryGameweek({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const { matchdayId } = await params;
  return <MyHistoryPanel matchdayId={matchdayId} />;
}
