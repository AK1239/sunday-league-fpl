import { MyPagesShell } from "@/components/manager/my-pages-shell";
import { MyHistoryPanel } from "@/components/manager/my-history-panel";

export default function MyHistoryPage() {
  return (
    <MyPagesShell>
      <MyHistoryPanel />
    </MyPagesShell>
  );
}
