import { Suspense } from "react";
import { AdminSettingsPanel } from "@/components/admin/admin-settings-panel";
import { PageHeader } from "@/components/fantasy/page-header";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="League settings"
        description="Timezone and default kickoff for new gameweek deadlines."
      />

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" role="status">
            Loading settings…
          </p>
        }
      >
        <AdminSettingsPanel />
      </Suspense>
    </div>
  );
}
