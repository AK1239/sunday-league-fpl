import { AdminManagersPanel } from "@/components/admin/admin-managers-panel";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { listManagersForAdmin } from "@/server/queries/admin-managers";

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const managers = await listManagersForAdmin(getDb());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Managers
        </h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Disable accounts to block sign-in, or delete a manager to remove their
          data and free their email. You cannot change your own account from
          this list.
        </p>
      </header>

      <AdminManagersPanel managers={managers} currentUserId={session.userId} />
    </div>
  );
}
