import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerLoginForm } from "@/components/manager/manager-login-form";
import { getUserSession } from "@/server/auth/session";

export async function ManagerLoginContent() {
  const session = await getUserSession();
  if (session) {
    redirect("/my");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Manager sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick your fantasy team and track your points.
        </p>
      </header>
      <ManagerLoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Need an account? Ask the league admin for an invite link.
      </p>
      <p className="text-center text-sm">
        <Link href="/" className="text-primary hover:underline">
          Back to league home
        </Link>
      </p>
    </div>
  );
}
