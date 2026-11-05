import { Award } from "lucide-react";
import { EmptyState } from "@/components/fantasy/empty-state";

export default function AwardsPlaceholderPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Awards
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Season trophies and hall of fame will appear here.
        </p>
      </header>
      <EmptyState
        icon={<Award className="mx-auto size-10" />}
        title="Awards hall coming soon"
        description="Golden Boot, Playmaker, and season champions will be tracked automatically once seasons are live."
      />
    </div>
  );
}
