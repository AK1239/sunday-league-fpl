import { AdminAppShell } from "@/components/admin/admin-app-shell";

export function AdminShell({
  email,
  displayName,
  children,
}: {
  email: string;
  displayName: string;
  children: React.ReactNode;
}) {
  return (
    <AdminAppShell email={email} displayName={displayName}>
      {children}
    </AdminAppShell>
  );
}
