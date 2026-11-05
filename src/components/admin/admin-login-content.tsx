import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/server/auth/session";

export async function AdminLoginContent() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <AuthShell
      eyebrow="Admin"
      title="Admin console"
      subtitle="Sign in to manage players, seasons and invites."
      footer={
        <Link
          href="/"
          className="inline-block font-medium text-primary transition-colors hover:underline"
        >
          ← Back to league
        </Link>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
