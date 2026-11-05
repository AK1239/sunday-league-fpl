import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ManagerLoginForm } from "@/components/manager/manager-login-form";
import { getUserSession } from "@/server/auth/session";

export async function ManagerLoginContent() {
  const session = await getUserSession();
  if (session) {
    redirect("/my");
  }

  return (
    <AuthShell
      eyebrow="Manager"
      title="Welcome back"
      subtitle="Sign in to pick your team and track your points."
      footer={
        <>
          <p>Need an account? Ask the league admin for an invite link.</p>
          <Link
            href="/"
            className="inline-block font-medium text-primary transition-colors hover:underline"
          >
            ← Back to league home
          </Link>
        </>
      }
    >
      <ManagerLoginForm />
    </AuthShell>
  );
}
