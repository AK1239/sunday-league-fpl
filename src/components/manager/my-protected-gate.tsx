import { redirect } from "next/navigation";
import { managerLogoutAction } from "@/server/actions/manager-auth";
import { getUserSession } from "@/server/auth/session";
import { Button } from "@/components/ui/button";
import { LEAGUE_NAME } from "@/lib/league";

export async function MyProtectedGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border/60 bg-card/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              My league
            </p>
            <p className="font-heading text-sm font-semibold">{LEAGUE_NAME}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{session.displayName}</span>
            <form action={managerLogoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
