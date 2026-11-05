import { Suspense } from "react";
import { CreatePlayerForm } from "@/components/admin/create-player-form";
import { AdminPlayersList } from "@/components/admin/admin-players-list";

export default function AdminPlayersPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Players
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add squad members and upload avatars.
        </p>
      </header>

      <CreatePlayerForm />

      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" role="status">
            Loading squad…
          </p>
        }
      >
        <AdminPlayersList />
      </Suspense>
    </div>
  );
}
