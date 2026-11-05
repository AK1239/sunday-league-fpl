import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/auth-loading";
import { AdminLoginContent } from "@/components/admin/admin-login-content";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AdminLoginContent />
    </Suspense>
  );
}
