import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/server/auth/session";

export async function AdminProtectedGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell email={session.email} displayName={session.displayName}>
      {children}
    </AdminShell>
  );
}
