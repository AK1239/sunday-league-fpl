import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/server/auth/session";
import { LEAGUE_NAME } from "@/lib/league";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Admin
          </p>
          <h1 className="font-heading mt-2 text-2xl font-bold tracking-tight">
            {LEAGUE_NAME}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage players and seasons.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← Back to league
          </Link>
        </p>
      </div>
    </div>
  );
}
