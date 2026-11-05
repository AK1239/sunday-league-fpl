import { Suspense } from "react";
import { ManagerLoginContent } from "@/components/manager/manager-login-content";

export default function ManagerLoginPage() {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm text-muted-foreground" role="status">
          Loading…
        </p>
      }
    >
      <ManagerLoginContent />
    </Suspense>
  );
}
