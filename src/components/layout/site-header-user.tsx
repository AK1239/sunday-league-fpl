import Link from "next/link";
import { connection } from "next/server";
import { getUserSession } from "@/server/auth/session";
import { HeaderUserMenu } from "./header-user-menu";

export async function SiteHeaderUser() {
  await connection();
  const session = await getUserSession();

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Log in
      </Link>
    );
  }

  return (
    <HeaderUserMenu
      displayName={session.displayName}
      isAdmin={session.role === "admin"}
    />
  );
}
