import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserSession } from "@/server/auth/session";
import { recordAuthenticatedVisit } from "@/server/domain/record-authenticated-visit";

function clientMetaFromHeaders(headerStore: Headers): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      null,
    userAgent: headerStore.get("user-agent"),
  };
}

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

  const headerStore = await headers();
  const path = headerStore.get("x-activity-path") ?? "/my";
  const { ipAddress, userAgent } = clientMetaFromHeaders(headerStore);
  await recordAuthenticatedVisit({
    userId: session.userId,
    role: session.role,
    path,
    ipAddress,
    userAgent,
  });

  return <>{children}</>;
}
