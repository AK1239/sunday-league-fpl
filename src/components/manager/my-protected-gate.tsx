import { redirect } from "next/navigation";
import { getUserSession } from "@/server/auth/session";

/** Auth only — chrome comes from PublicShell SiteHeader + BottomNav. */
export async function MyProtectedGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();
  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
