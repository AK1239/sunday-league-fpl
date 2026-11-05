import { Suspense } from "react";
import { AdminLoginContent } from "@/components/admin/admin-login-content";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
