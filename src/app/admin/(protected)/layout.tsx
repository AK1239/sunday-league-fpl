import { Suspense } from "react";
import { AdminProtectedGate } from "@/components/admin/admin-protected-gate";

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
