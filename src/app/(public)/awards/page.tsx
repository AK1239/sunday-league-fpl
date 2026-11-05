import { PageHeader } from "@/components/fantasy/page-header";
import { Award } from "lucide-react";
import { EmptyState } from "@/components/fantasy/empty-state";

export default function AwardsPlaceholderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Honours"
        title="Awards"
        description="Season trophies and hall of fame will appear here."
      />
      <EmptyState
        icon={<Award className="mx-auto size-10" />}
        title="Awards hall coming soon"
        description="Golden Boot, Playmaker, and season champions will be tracked automatically once seasons are live."
      />
    </div>
  );
}
