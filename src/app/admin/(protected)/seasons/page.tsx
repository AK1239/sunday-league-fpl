import { Suspense } from "react";
import { CreateSeasonForm } from "@/components/admin/create-season-form";
import { AdminSeasonsList } from "@/components/admin/admin-seasons-list";

export default function AdminSeasonsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Seasons
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only one season can be active at a time.
        </p>
      </header>

      <CreateSeasonForm />

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" role="status">
            Loading seasons…
          </p>
        }
      >
        <AdminSeasonsList />
      </Suspense>
    </div>
  );
}
