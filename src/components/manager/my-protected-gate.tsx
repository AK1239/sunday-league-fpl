import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { Button } from "@/components/ui/button";
import { LEAGUE_NAME, LEAGUE_SHORT } from "@/lib/league";
import { managerLogoutAction } from "@/server/actions/manager-auth";
import { getUserSession } from "@/server/auth/session";

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
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="glow-primary flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
              {LEAGUE_SHORT}
            </span>
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary uppercase">
                My league
              </p>
              <p className="font-heading text-sm leading-tight font-semibold">
                {LEAGUE_NAME}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <PlayerAvatar name={session.displayName} size="sm" />
            <span className="hidden text-sm font-medium sm:inline">
              {session.displayName}
            </span>
            <form action={managerLogoutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut aria-hidden />
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
