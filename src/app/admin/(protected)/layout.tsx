import { Suspense } from "react";
import { AdminProtectedGate } from "@/components/admin/admin-protected-gate";

/** Cookie/session-backed admin; navigations are not expected to be instant (PPR). */
export const instant = false;

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8 text-sm text-muted-foreground">
          Loading admin…
        </div>
      }
    >
      <AdminProtectedGate>{children}</AdminProtectedGate>
    </Suspense>
  );
}
