import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/auth-loading";
import { ManagerLoginContent } from "@/components/manager/manager-login-content";

export default function ManagerLoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ManagerLoginContent />
    </Suspense>
  );
}
