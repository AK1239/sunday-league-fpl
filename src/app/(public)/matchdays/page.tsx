import { PageHeader } from "@/components/fantasy/page-header";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/fantasy/empty-state";

export default function MatchdaysPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fixtures"
        title="Matchdays"
        description="Full matchday history arrives when live data is connected."
      />
      <EmptyState
        icon={<CalendarDays className="mx-auto size-10" />}
        title="Matchdays coming soon"
        description="You can already see the latest results on the home page. Detailed matchday pages will ship in a later phase."
      />
    </div>
  );
}
