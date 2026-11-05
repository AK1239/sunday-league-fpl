import { Suspense } from "react";
import { AdminInvitesPanel } from "@/components/admin/admin-invites-panel";

export default function AdminInvitesPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Manager invites
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create one-time links for friends to join or reset a password.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" role="status">
            Loading invites…
          </p>
        }
      >
        <AdminInvitesPanel />
      </Suspense>
    </div>
  );
}
