import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/fantasy/empty-state";

export default function MatchdaysPlaceholderPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Matchdays
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full matchday history arrives when live data is connected.
        </p>
      </header>
      <EmptyState
        icon={<CalendarDays className="mx-auto size-10" />}
        title="Matchdays coming soon"
        description="You can already see the latest results on the home page. Detailed matchday pages will ship in a later phase."
      />
    </div>
  );
}
